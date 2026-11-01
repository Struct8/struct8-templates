#!/bin/bash
# WordPress on one Compute Engine VM: Apache, PHP and MariaDB on Debian 12, database on the VM.
# Compute Engine runs the startup script on every boot, so each step checks what an earlier
# boot already did. The site stops at the WordPress installation page; WP-CLI is installed
# for the configuration that follows.
set -eu
export DEBIAN_FRONTEND=noninteractive
WP_DIR=/var/www/wordpress
STATE=/var/lib/struct8-wordpress
mkdir -p "$STATE"
chmod 700 "$STATE"

# Swap: MariaDB and PHP together are tight on a machine with 2 GB or less.
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon --show | grep -q /swapfile || swapon /swapfile

if [ ! -f "$STATE/packages" ]; then
  apt-get update
  apt-get install -y apache2 mariadb-server php libapache2-mod-php php-mysql php-curl php-gd \
    php-mbstring php-xml php-zip php-intl php-imagick curl openssl
  touch "$STATE/packages"
fi
systemctl enable --now mariadb apache2

if [ ! -f "$STATE/db-password" ]; then
  DB_PASS=$(openssl rand -hex 24)
  mysql <<SQL
CREATE DATABASE IF NOT EXISTS wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wordpress'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER 'wordpress'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wordpress'@'localhost';
FLUSH PRIVILEGES;
SQL
  (umask 077; printf '%s' "$DB_PASS" > "$STATE/db-password")
fi

if [ ! -x /usr/local/bin/wp ]; then
  curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp
  chmod 755 /usr/local/bin/wp
fi

if [ ! -f "$WP_DIR/wp-load.php" ]; then
  curl -fsSL https://wordpress.org/latest.tar.gz -o /tmp/wordpress.tar.gz
  tar -xzf /tmp/wordpress.tar.gz -C /var/www
  rm -f /tmp/wordpress.tar.gz
fi
chown -R www-data:www-data "$WP_DIR"

if [ ! -f "$WP_DIR/wp-config.php" ]; then
  runuser -u www-data -- /usr/local/bin/wp config create --path="$WP_DIR" \
    --dbname=wordpress --dbuser=wordpress --dbpass="$(cat "$STATE/db-password")" --dbhost=localhost
  chmod 640 "$WP_DIR/wp-config.php"
fi

cat > /etc/php/8.2/apache2/conf.d/90-wordpress.ini <<'EOF'
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
EOF

cat > /etc/apache2/sites-available/wordpress.conf <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/wordpress
    <Directory /var/www/wordpress>
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog ${APACHE_LOG_DIR}/wordpress-error.log
    CustomLog ${APACHE_LOG_DIR}/wordpress-access.log combined
</VirtualHost>
EOF
a2enmod -q rewrite
a2dissite -q 000-default || true
a2ensite -q wordpress
systemctl reload apache2
