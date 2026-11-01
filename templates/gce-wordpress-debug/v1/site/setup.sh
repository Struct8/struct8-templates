#!/bin/bash
# Builds the demo store on the WordPress lab VM: Portuguese, WooCommerce, catalog, pages.
# Run as root with the commit to fetch store.php from; WP-CLI runs as www-data.
# Every step can run again: the plugins are installed once and store.php updates in place.
set -eu
REF=${1:?commit or branch of Struct8/struct8-templates}
BASE=https://raw.githubusercontent.com/Struct8/struct8-templates/$REF/templates/gce-wordpress-debug/v1/site
wp() { runuser -u www-data -- env HOME=/tmp /usr/local/bin/wp --path=/var/www/wordpress "$@"; }

echo "== language and general settings"
wp language core install pt_BR --activate
wp option update timezone_string America/Sao_Paulo
wp option update date_format 'j \d\e F \d\e Y'
wp option update time_format 'H:i'
wp option update start_of_week 0
wp option update blogdescription 'Roupas e acessórios com entrega para todo o Brasil'
wp rewrite structure '/%postname%/' --hard

echo "== plugins"
wp plugin is-installed woocommerce || wp plugin install woocommerce
wp language plugin install woocommerce pt_BR || true
wp language theme install twentytwentyfive pt_BR || true
wp plugin activate woocommerce
wp plugin delete hello akismet || true

echo "== store"
curl -fsSL "$BASE/store.php" -o /tmp/store.php
chmod 644 /tmp/store.php
wp eval-file /tmp/store.php --user=1
wp rewrite flush --hard
wp cache flush
echo "== done"
