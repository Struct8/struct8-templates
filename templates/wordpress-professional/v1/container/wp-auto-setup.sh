#!/bin/bash
# First start of the WordPress Professional template.
#
# The task runs this on every start, before Apache, and it works once per site:
# it installs WordPress, the language, the plugins this template configures in
# WORDPRESS_CONFIG_EXTRA (Redis Object Cache, WP Offload Media Lite and WP Offload
# SES Lite), Two Factor, a must-use plugin with the site's hardening and, with
# WP_DEMO_CONTENT=true, a sample site with photos and a contact form whose
# messages are also kept in the administration panel. A marker on the EFS volume
# ends every later start in under a second.
#
# WP_AUTO_SETUP=false turns it off, and the site starts on the WordPress
# installation screen. A site somebody installed before this ran is left alone.

log() { echo "wp-setup: $*"; }

case "$WP_AUTO_SETUP" in
  false|False|FALSE|0|no|off) log "WP_AUTO_SETUP is off: nothing to do"; exit 0 ;;
esac

SITE=/var/www/html
DONE=$SITE/.struct8-setup-done
STARTED=$SITE/.struct8-setup-started
LOCK=$SITE/.struct8-setup-lock
WPCLI=/tmp/wp-cli.phar

if [ -e "$DONE" ]; then log "site already set up"; exit 0; fi

# Two tasks start together on a new site and share the volume. mkdir is atomic
# there, so one of them installs and the other waits for the marker.
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  if [ -e "$DONE" ]; then log "set up by another task"; exit 0; fi
  if [ "$waited" -ge 480 ]; then
    log "the setup lock is 8 minutes old: taking it over"
    rmdir "$LOCK" 2>/dev/null
    waited=0
  else
    sleep 5
    waited=$((waited + 5))
  fi
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
if [ -e "$DONE" ]; then log "set up by another task"; exit 0; fi

cd "$SITE" || exit 1
if ! command -v docker-ensure-installed.sh >/dev/null 2>&1; then
  log "this image has no docker-ensure-installed.sh: finish the installation at /wp-admin/install.php"
  exit 0
fi
# Copies WordPress to the volume and writes wp-config.php from the WORDPRESS_*
# variables without starting Apache, so the installation screen is never served.
docker-ensure-installed.sh true || exit 1

retry() {
  n=1
  until "$@"; do
    if [ "$n" -ge 12 ]; then return 1; fi
    log "attempt $n of 12 failed: trying again in 10 seconds"
    n=$((n + 1))
    sleep 10
  done
}

retry curl -fsSL -o "$WPCLI" https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar || { log "could not download WP-CLI"; exit 1; }
wp() { php "$WPCLI" --allow-root --path="$SITE" "$@"; }

if wp core is-installed >/dev/null 2>&1; then
  if [ ! -e "$STARTED" ]; then
    log "WordPress was installed before this setup ran: leaving the site as it is"
    touch "$DONE"
    exit 0
  fi
else
  if [ -z "$WP_ADMIN_PASSWORD" ]; then log "WP_ADMIN_PASSWORD is empty"; exit 1; fi
  touch "$STARTED"
  wp core install --url="$WP_SITE_URL" --title="$WP_SITE_TITLE" --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" --admin_email="$WP_ADMIN_EMAIL" --skip-email || exit 1
  log "WordPress installed: the administrator is $WP_ADMIN_USER"
  # Posts and the REST API show the author's public name and address slug, and
  # both start as the login name. Different from it, they do not tell a visitor
  # which user name to try.
  wp user update "$WP_ADMIN_USER" --user_nicename=editor --display_name=Editor --nickname=Editor \
    || log "the administrator's public name was not changed"
fi

if [ -n "$WP_LOCALE" ] && [ "$WP_LOCALE" != "en_US" ]; then
  retry wp language core install "$WP_LOCALE" --activate || log "language $WP_LOCALE was not installed"
fi
if [ -n "$WP_TIMEZONE" ]; then
  wp option update timezone_string "$WP_TIMEZONE" || log "time zone $WP_TIMEZONE was refused"
fi
wp rewrite structure '/%postname%/' || log "permalinks were not set"

# Two Factor is installed and left for each user to turn on in their profile.
# Turned on here it would send the login code by email, and an email that does
# not arrive (SES sandbox, an unverified address) would lock the administrator out.
PLUGINS="redis-cache amazon-s3-and-cloudfront wp-ses two-factor"
for plugin in $PLUGINS; do
  retry wp plugin install "$plugin" --activate || log "plugin $plugin was not installed"
done
wp plugin auto-updates enable $PLUGINS || log "plugin auto-updates were not turned on"
wp redis enable || log "the Redis object cache was not enabled"
# WP Offload SES creates its tables the first time an administration page
# loads, and until then every message fails. A new site can need one before
# that: a password reset, a message from the contact form.
wp eval 'global $wp_offload_ses; if (!isset($wp_offload_ses)) exit(1); $wp_offload_ses->upgrade_routines();' \
  || log "the tables of WP Offload SES were not created"

# A must-use plugin: no theme or plugin update removes it.
mkdir -p "$SITE/wp-content/mu-plugins"
cat > "$SITE/wp-content/mu-plugins/struct8-site.php" <<'MU'
<?php
// Site settings of the WordPress Professional template, written on its first start.

// XML-RPC is where password guessing goes, and nothing on this site uses it: the
// block editor and the WordPress apps use the REST API.
if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) {
  http_response_code(403);
  exit;
}
add_filter('xmlrpc_enabled', '__return_false');

// Visitors who are not logged in do not get the list of users.
add_filter('rest_endpoints', function ($endpoints) {
  if (!is_user_logged_in()) {
    unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
  }
  return $endpoints;
});

// Messages from the site go out under its title instead of "WordPress".
add_filter('wp_mail_from_name', function ($name) {
  return $name === 'WordPress' ? wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES) : $name;
});
MU


case "$WP_DEMO_CONTENT" in
  true|True|TRUE|1|yes|on) demo=yes ;;
  *) demo=no ;;
esac
if [ "$demo" = yes ] && ! wp option get struct8_demo_content >/dev/null 2>&1; then
  # The Contact page holds its form. Activating the plugin creates the form,
  # and its messages go to the site's administration email address. Contact
  # Form 7 keeps no copy, and the visitor is told the message was sent before
  # the email goes out: Flamingo keeps every message under Flamingo > Inbound
  # Messages, so one whose email never arrives is still there.
  for plugin in contact-form-7 flamingo; do
    retry wp plugin install "$plugin" --activate || log "plugin $plugin was not installed"
  done
  wp plugin auto-updates enable contact-form-7 flamingo || log "plugin auto-updates were not turned on"
  # Pages, posts and photos of the active theme, built in one PHP run: every wp
  # command starts WordPress again, and the first start has a time limit.
  cat > /tmp/struct8-demo.php <<'PHP'
<?php
// Sample site of the WordPress Professional template, run by wp-auto-setup.sh.
//
// The photos are the ones the active theme ships in assets/images (Twenty
// Twenty-Five has about 30). They are imported into the media library, so Offload
// Media sends them to S3. A photo the theme does not have is left out and the
// block that shows it goes with it: a theme without photos gets text only pages.

kses_remove_filters();
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

global $photos;
$photos = array();

function demo_photo($key, $name, $alt) {
  global $photos;
  $files = glob(get_template_directory() . '/assets/images/' . $name . '.*');
  if (!$files) return;
  $tmp = wp_tempnam($files[0]);
  if (!$tmp || !copy($files[0], $tmp)) return;
  $id = media_handle_sideload(array('name' => basename($files[0]), 'tmp_name' => $tmp), 0, $alt);
  if (is_wp_error($id)) {
    @unlink($tmp);
    fwrite(STDERR, 'wp-setup: photo ' . $name . ' was not imported: ' . $id->get_error_message() . PHP_EOL);
    return;
  }
  update_post_meta($id, '_wp_attachment_image_alt', $alt);
  $photos[$key] = array('id' => $id, 'url' => get_post_field('guid', $id), 'alt' => $alt);
}

function demo_p($text, $center = false) {
  if ($center) return "<!-- wp:paragraph {\"align\":\"center\"} -->\n<p class=\"has-text-align-center\">" . $text . "</p>\n<!-- /wp:paragraph -->\n\n";
  return "<!-- wp:paragraph -->\n<p>" . $text . "</p>\n<!-- /wp:paragraph -->\n\n";
}

function demo_h($text, $level = 2, $center = false) {
  $attrs = array();
  if ($center) $attrs['textAlign'] = 'center';
  if ($level != 2) $attrs['level'] = $level;
  $json = $attrs ? ' ' . wp_json_encode($attrs) : '';
  $class = 'wp-block-heading' . ($center ? ' has-text-align-center' : '');
  return '<!-- wp:heading' . $json . " -->\n<h" . $level . ' class="' . $class . '">' . $text . '</h' . $level . ">\n<!-- /wp:heading -->\n\n";
}

function demo_image($key, $ratio = '') {
  global $photos;
  if (!isset($photos[$key])) return '';
  $f = $photos[$key];
  $attrs = array('id' => $f['id']);
  $style = '';
  if ($ratio !== '') {
    $attrs['aspectRatio'] = $ratio;
    $attrs['scale'] = 'cover';
    $style = ' style="aspect-ratio:' . $ratio . ';object-fit:cover"';
  }
  $attrs['sizeSlug'] = 'large';
  $attrs['linkDestination'] = 'none';
  return '<!-- wp:image ' . wp_json_encode($attrs) . " -->\n" .
    '<figure class="wp-block-image size-large"><img src="' . esc_url($f['url']) . '" alt="' . esc_attr($f['alt']) . '" class="wp-image-' . $f['id'] . '"' . $style . '/></figure>' . "\n" .
    "<!-- /wp:image -->\n\n";
}

function demo_buttons($items, $center = false) {
  $json = $center ? ' {"layout":{"type":"flex","justifyContent":"center"}}' : '';
  $out = '<!-- wp:buttons' . $json . " -->\n<div class=\"wp-block-buttons\">";
  foreach ($items as $label => $url) {
    $out .= "<!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"" . esc_url($url) . "\">" . $label . "</a></div>\n<!-- /wp:button -->";
  }
  return $out . "</div>\n<!-- /wp:buttons -->\n\n";
}

function demo_cover($key, $inner) {
  global $photos;
  if (!isset($photos[$key])) return $inner;
  $f = $photos[$key];
  $attrs = wp_json_encode(array('url' => $f['url'], 'id' => $f['id'], 'dimRatio' => 40, 'minHeight' => 420, 'align' => 'full'));
  return '<!-- wp:cover ' . $attrs . " -->\n" .
    '<div class="wp-block-cover alignfull" style="min-height:420px"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-40 has-background-dim"></span><img class="wp-block-cover__image-background wp-image-' . $f['id'] . '" alt="' . esc_attr($f['alt']) . '" src="' . esc_url($f['url']) . '" data-object-fit="cover"/><div class="wp-block-cover__inner-container">' . "\n" . $inner . '</div></div>' . "\n" .
    "<!-- /wp:cover -->\n\n";
}

function demo_columns($cells) {
  $out = "<!-- wp:columns {\"align\":\"wide\"} -->\n<div class=\"wp-block-columns alignwide\">";
  foreach ($cells as $cell) {
    $out .= "<!-- wp:column -->\n<div class=\"wp-block-column\">" . $cell . "</div>\n<!-- /wp:column -->";
  }
  return $out . "</div>\n<!-- /wp:columns -->\n\n";
}

function demo_gallery($keys) {
  $inner = '';
  foreach ($keys as $key) $inner .= demo_image($key);
  if ($inner === '') return '';
  return "<!-- wp:gallery {\"columns\":4,\"linkTo\":\"none\",\"align\":\"wide\"} -->\n<figure class=\"wp-block-gallery alignwide has-nested-images columns-4 is-cropped\">" . $inner . "</figure>\n<!-- /wp:gallery -->\n\n";
}

function demo_post($type, $title, $content, $order = 0, $thumbnail = '') {
  global $photos;
  $id = wp_insert_post(array(
    'post_type' => $type,
    'post_status' => 'publish',
    'post_title' => $title,
    'post_content' => $content,
    'menu_order' => $order,
  ), true);
  if (is_wp_error($id)) {
    fwrite(STDERR, 'wp-setup: ' . $title . ' was not created: ' . $id->get_error_message() . PHP_EOL);
    return 0;
  }
  if ($thumbnail !== '' && isset($photos[$thumbnail])) set_post_thumbnail($id, $photos[$thumbnail]['id']);
  return $id;
}

demo_photo('hero', 'coming-soon-bg-image', 'A meadow of wildflowers with a lone tree');
demo_photo('bloom', 'botany-flowers-closeup', 'White flowers with long green leaves');
demo_photo('hibiscus', 'red-hibiscus-closeup', 'A red hibiscus flower');
demo_photo('meadow', 'flower-meadow-square', 'A meadow of yellow and red flowers');
demo_photo('birds', 'marshland-birds-square', 'Two birds standing in shallow water at sunset');
demo_photo('coral', 'coral-square', 'Coral growing under the sea');
demo_photo('creek', 'dallas-creek-square', 'A flower with orange petals against a dark background');
demo_photo('purple', 'malibu-plantlife', 'A purple flower');

// The "Hello world!" post and the "Sample Page" of a new installation.
$hello = get_page_by_path('hello-world', OBJECT, 'post');
if ($hello) wp_delete_post($hello->ID, true);
$sample = get_page_by_path('sample-page');
if ($sample) wp_delete_post($sample->ID, true);

$home = demo_post('page', 'Home',
  demo_cover('hero',
    demo_h('Welcome', 1, true) .
    demo_p('A WordPress site that runs on AWS, ready for you to edit.', true) .
    demo_buttons(array('Read the blog' => home_url('/blog/'), 'Get in touch' => home_url('/contact/')), true)
  ) .
  demo_columns(array(
    demo_image('bloom', '4/3') . demo_h('Write', 3) . demo_p('Add posts and pages with the block editor. Everything on this site is sample content that you can edit or delete.'),
    demo_image('hibiscus', '4/3') . demo_h('Show', 3) . demo_p('Upload photos to the media library. They are copied to Amazon S3 and delivered by CloudFront.'),
    demo_image('birds', '4/3') . demo_h('Run', 3) . demo_p('Amazon ECS serves the site, Aurora keeps the data and ElastiCache holds the object cache.'),
  )) .
  demo_h('Latest posts', 2, true) .
  '<!-- wp:latest-posts {"postsToShow":3,"displayPostDate":true,"displayFeaturedImage":true,"featuredImageSizeSlug":"medium","postLayout":"grid","columns":3,"align":"wide"} /-->' . "\n\n",
  1
);
demo_post('page', 'About',
  demo_columns(array(
    demo_image('meadow'),
    demo_h('About this site') . demo_p('Tell your visitors who you are and what this site is for.'),
  )),
  2
);
demo_post('page', 'Gallery',
  demo_p('The photos on this page come with the theme and live in the media library.') .
  demo_gallery(array('hero', 'bloom', 'hibiscus', 'meadow', 'birds', 'coral', 'creek', 'purple')),
  3
);
$blog = demo_post('page', 'Blog', '', 4);
// The form Contact Form 7 creates when it is activated. Without the plugin the
// page keeps a line of text.
$forms = get_posts(array('post_type' => 'wpcf7_contact_form', 'numberposts' => 1, 'orderby' => 'ID', 'order' => 'ASC'));
if ($forms) {
  $contact = demo_p('Send a message with the form below. It goes to the email address of the site administrator.') .
    "<!-- wp:shortcode -->\n[contact-form-7 id=\"" . $forms[0]->ID . "\" title=\"" . esc_attr($forms[0]->post_title) . "\"]\n<!-- /wp:shortcode -->\n\n";
} else {
  $contact = demo_p('Replace this text with the ways to reach you.');
}
demo_post('page', 'Contact', $contact, 5);

// The featured image is the post's photo: the theme shows it on the Blog page and
// above the post, so the content holds no second copy of it. The three are square,
// so the latest posts grid of the home page has cells of one size.
demo_post('post', 'Welcome to your new site',
  demo_p('This is a sample post. Posts appear on the Blog page and in the latest posts list of the home page.'),
  0, 'creek');
demo_post('post', 'Your photos are served from Amazon S3',
  demo_p('Photos uploaded to the media library are copied to an S3 bucket by WP Offload Media Lite and delivered by CloudFront under /wp-content/media/.'),
  0, 'meadow');
$next = demo_p('Change the site title and the theme under Appearance, replace the sample pages with your own, and turn on two-factor authentication in your profile after the first login.');
if ($forms && defined('FLAMINGO_VERSION')) {
  $next .= demo_p('Messages sent from the Contact page arrive by email and are also kept under Flamingo, Inbound Messages.');
}
demo_post('post', 'Next steps', $next, 0, 'coral');

if ($home && wp_is_block_theme() && file_exists(get_template_directory() . '/templates/page-no-title.html')) {
  update_post_meta($home, '_wp_page_template', 'page-no-title');
}
if ($home && $blog) {
  update_option('show_on_front', 'page');
  update_option('page_on_front', $home);
  update_option('page_for_posts', $blog);
}
update_option('blogdescription', 'A WordPress site on AWS');

// The footer of Twenty Twenty-Five links to pages that do not exist. A footer of
// the site's own pages replaces it, in the database, so a theme update keeps it.
if (wp_is_block_theme()) {
  $footer = '<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->' . "\n" .
    '<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">' .
    '<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->' . "\n" .
    '<div class="wp-block-group alignwide"><!-- wp:site-title {"level":0} /-->' . "\n" .
    '<!-- wp:navigation {"overlayMenu":"never","layout":{"type":"flex","setCascadingProperties":true,"justifyContent":"right"}} -->' . "\n" .
    '<!-- wp:page-list /-->' . "\n" .
    '<!-- /wp:navigation --></div>' . "\n" .
    '<!-- /wp:group -->' . "\n\n" .
    '<!-- wp:group {"align":"wide"} -->' . "\n" .
    '<div class="wp-block-group alignwide"><!-- wp:paragraph -->' . "\n" . '<p>Built with WordPress on AWS.</p>' . "\n" . '<!-- /wp:paragraph --></div>' . "\n" .
    '<!-- /wp:group --></div>' . "\n" .
    '<!-- /wp:group -->';
  $part = wp_insert_post(array(
    'post_type' => 'wp_template_part',
    'post_status' => 'publish',
    'post_name' => 'footer',
    'post_title' => 'Footer',
    'post_content' => $footer,
  ), true);
  if (!is_wp_error($part)) {
    wp_set_object_terms($part, get_stylesheet(), 'wp_theme');
    wp_set_object_terms($part, 'footer', 'wp_template_part_area');
  }
}

add_option('struct8_demo_content', 1);
echo 'wp-setup: ' . count($photos) . ' photos imported' . PHP_EOL;
PHP
  if wp eval-file /tmp/struct8-demo.php; then log "demo content created"; else log "demo content was not created"; fi
  rm -f /tmp/struct8-demo.php
fi

chown -R www-data:www-data "$SITE/wp-content" 2>/dev/null
touch "$DONE"
rm -f "$STARTED" "$WPCLI"
log "done"
