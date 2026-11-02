#!/bin/bash
# Every start of the container: the database user, the first-start setup of the
# site, then Apache. The prebuild hook of the source bundle wrote the values these
# read to /opt/struct8/wordpress.env on the instance, and compose passes them in.
php /opt/struct8/db-bootstrap.php || echo "db-bootstrap: the database user was not updated"
bash /opt/struct8/wp-auto-setup.sh || exit 1
unset WP_ADMIN_PASSWORD DB_ADMIN_USER DB_ADMIN_PASSWORD_B64
exec docker-entrypoint.sh apache2-foreground
