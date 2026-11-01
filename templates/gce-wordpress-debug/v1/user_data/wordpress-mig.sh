#!/bin/bash
# WordPress on the VMs of a managed instance group: Apache and PHP on Debian 12, the site files on
# a Filestore share and the database on Cloud SQL. Every VM of the group runs this script, on every
# boot. The first VM that finds the share empty installs WordPress under a lock on the share; the
# others wait for it and serve the same files. The site stops at the WordPress installation page.
#
# The variables come from /etc/struct8_env, written above this script by the compile:
#   FILESTORE_IP  the address of the Filestore instance
#   DB_HOST       the private address of the Cloud SQL instance
#   DB_PASSWORD   the password of the Cloud SQL user `wordpress`
set -eu
export DEBIAN_FRONTEND=noninteractive
: "${FILESTORE_IP:?}" "${DB_HOST:?}" "${DB_PASSWORD:?}"
SHARE=wordpress
WP_DIR=/var/www/wordpress
STATE=/var/lib/struct8-wordpress
mkdir -p "$STATE"
chmod 700 "$STATE"

if [ ! -f "$STATE/packages" ]; then
  apt-get update
  apt-get install -y apache2 php libapache2-mod-php php-mysql php-curl php-gd php-mbstring \
    php-xml php-zip php-intl php-imagick curl nfs-common mariadb-client
  touch "$STATE/packages"
fi

# The share: the same files on every VM. `hard` makes a request wait for Filestore instead of
# failing, and `nofail` lets the VM boot while the share is unreachable.
mkdir -p "$WP_DIR"
grep -q " $WP_DIR nfs " /etc/fstab ||
  echo "$FILESTORE_IP:/$SHARE $WP_DIR nfs defaults,_netdev,nofail,hard,timeo=600 0 0" >> /etc/fstab
until mountpoint -q "$WP_DIR"; do
  mount "$WP_DIR" || sleep 10
done

if [ ! -x /usr/local/bin/wp ]; then
  curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp
  chmod 755 /usr/local/bin/wp
fi

# One VM installs; flock on the share holds the others until it is done.
(
  flock 9
  if [ ! -f "$WP_DIR/wp-load.php" ]; then
    curl -fsSL https://wordpress.org/latest.tar.gz -o /tmp/wordpress.tar.gz
    tar -xzf /tmp/wordpress.tar.gz -C "$WP_DIR" --strip-components=1
    rm -f /tmp/wordpress.tar.gz
  fi
  if [ ! -f "$WP_DIR/wp-config.php" ]; then
    chown www-data:www-data "$WP_DIR"
    runuser -u www-data -- env HOME=/tmp /usr/local/bin/wp config create --path="$WP_DIR" \
      --dbname=wordpress --dbuser=wordpress --dbpass="$DB_PASSWORD" --dbhost="$DB_HOST" \
      --extra-php <<'PHP'
define('FS_METHOD', 'direct');
PHP
    chmod 640 "$WP_DIR/wp-config.php"
    chown -R www-data:www-data "$WP_DIR"
  fi
) 9> "$WP_DIR/.install.lock"

cat > /etc/php/8.2/apache2/conf.d/90-wordpress.ini <<'EOF'
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
EOF

# The health check of the load balancer reads /healthz, which answers 200 before WordPress is
# installed too: the installation page answers with a redirect.
mkdir -p /var/www/health
echo ok > /var/www/health/healthz
cat > /etc/apache2/sites-available/wordpress.conf <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/wordpress
    Alias /healthz /var/www/health/healthz
    <Directory /var/www/health>
        Require all granted
    </Directory>
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
systemctl enable apache2
systemctl reload-or-restart apache2
