#!/bin/bash
# Builds wp-setup-assets.tar.gz, the archive wp-auto-setup.sh downloads from S3
# on each start of a WordPress task. It runs on a GitHub Actions runner with
# Docker (.github/workflows/wordpress-setup-assets.yml), never in a customer's
# account: the archive is committed, and the template publishes the committed
# file.
#
#   build.sh extension <dir>         compile the PHP extension for the runner's
#                                    architecture into <dir>/<arch>/
#   build.sh assemble <ext> <out>    the PHP libraries, WP-CLI and the extensions
#                                    in <ext> into the archive <out>
#   build.sh smoke <archive>         serve a traced request with the archive in
#                                    the WordPress image, on this architecture
#
# Every version comes from versions.env and composer.lock, and every download is
# checked against the checksum written there.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=versions.env
. "$here/versions.env"

# ECR Public throttles anonymous pulls and answers "toomanyrequests: Rate
# exceeded" for a while; a pull tried again a little later goes through.
pull_image() {
  docker image inspect "$WORDPRESS_IMAGE" >/dev/null 2>&1 && return 0
  for wait in 15 30 60 120; do
    docker pull -q "$WORDPRESS_IMAGE" && return 0
    echo "could not pull the WordPress image; trying again in ${wait}s"
    sleep "$wait"
  done
  docker pull "$WORDPRESS_IMAGE"
}

in_image() {
  pull_image
  docker run --rm -e HOME=/tmp "$@"
}

# pecl.php.net answers 500 for minutes at a time: wait up to five minutes.
fetch() { # url sha256 file
  curl -fsSL --retry 10 --retry-delay 20 --retry-max-time 300 --retry-all-errors -o "$3" "$1"
  echo "$2  $3" | sha256sum -c -
}

case "${1:-}" in
  extension)
    out=$(realpath -m "$2")
    work=$(mktemp -d)
    fetch "https://pecl.php.net/get/opentelemetry-$OTEL_EXTENSION_VERSION.tgz" "$OTEL_EXTENSION_SHA256" "$work/opentelemetry.tgz"
    in_image -v "$work:/work" "$WORDPRESS_IMAGE" sh -euc '
      api=$(basename "$(php -r "echo PHP_EXTENSION_DIR;")")
      [ "$api" = "$0" ] || { echo "the image has the extension API $api, versions.env says $0"; exit 1; }
      mkdir /tmp/src
      tar -xzf /work/opentelemetry.tgz -C /tmp/src
      cd /tmp/src/opentelemetry-"$1"
      phpize >/dev/null
      ./configure --quiet
      make -s -j"$(nproc)"
      mkdir -p /work/out
      cp modules/opentelemetry.so /work/out/opentelemetry.so
      uname -m > /work/out/arch
    ' "$PHP_EXTENSION_API" "$OTEL_EXTENSION_VERSION"
    arch=$(cat "$work/out/arch")
    mkdir -p "$out/$arch"
    cp "$work/out/opentelemetry.so" "$out/$arch/opentelemetry.so"
    echo "extension $OTEL_EXTENSION_VERSION for $arch: $(sha256sum < "$out/$arch/opentelemetry.so" | cut -d' ' -f1)"
    ;;

  assemble)
    ext=$(realpath -m "$2")
    out=$(realpath -m "$3")
    for arch in aarch64 x86_64; do
      [ -f "$ext/$arch/opentelemetry.so" ] || { echo "no extension for $arch in $ext"; exit 1; }
    done
    work=$(mktemp -d)
    mkdir -p "$work/src" "$work/root/tracing/ext"
    cp "$here/composer.json" "$work/src/"
    [ -f "$here/composer.lock" ] && cp "$here/composer.lock" "$work/src/"
    fetch "https://getcomposer.org/download/$COMPOSER_VERSION/composer.phar" "$COMPOSER_SHA256" "$work/composer.phar"
    fetch "https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar" "$WP_CLI_SHA256" "$work/root/wp-cli.phar"

    # With no composer.lock yet, the first build resolves one from composer.json
    # and leaves it next to the archive: commit it, and every later build
    # installs exactly it.
    if [ -f "$work/src/composer.lock" ]; then verb=install; else verb=update; fi
    in_image -v "$work:/work" -w /work/src "$WORDPRESS_IMAGE" sh -euc '
      COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_HOME=/tmp/composer php /work/composer.phar "$0" \
        --no-dev --no-interaction --no-progress --ignore-platform-req=ext-opentelemetry
      chown -R "$1" /work/src
    ' "$verb" "$(id -u):$(id -g)"
    if [ "$verb" = update ]; then
      cp "$work/src/composer.lock" "$(dirname "$out")/composer.lock"
      echo "composer.lock was created: commit $(dirname "$out")/composer.lock next to composer.json"
    fi
    cmp -s "$work/src/composer.lock" "${here}/composer.lock" 2>/dev/null || [ "$verb" = update ] ||
      { echo "composer install changed composer.lock"; exit 1; }

    mv "$work/src/vendor" "$work/root/tracing/vendor"
    for arch in aarch64 x86_64; do
      mkdir -p "$work/root/tracing/ext/$arch"
      cp "$ext/$arch/opentelemetry.so" "$work/root/tracing/ext/$arch/opentelemetry.so"
    done
    echo "$PHP_EXTENSION_API" > "$work/root/tracing/ext/api"
    {
      echo "image=$WORDPRESS_IMAGE"
      echo "opentelemetry-extension=$OTEL_EXTENSION_VERSION"
      echo "wp-cli=$WP_CLI_VERSION"
      php_packages=$(node -e '
        const lock = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
        console.log(lock.packages.map((p) => p.name + "=" + p.version).sort().join("\n"));
      ' "$work/src/composer.lock")
      echo "$php_packages"
    } > "$work/root/VERSIONS"

    # Same input, same bytes: sorted names, no dates, no owners.
    tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner \
      --mode='u+rwX,go+rX,go-w' -C "$work/root" -cf - . | gzip -n -9 > "$out"
    echo "archive $out: $(sha256sum < "$out" | cut -d' ' -f1), $(du -h "$out" | cut -f1)"
    ;;

  smoke)
    archive=$(realpath -m "$2")
    work=$(mktemp -d)
    mkdir -p "$work/assets" "$work/site"
    tar -xzf "$archive" -C "$work/assets"
    # The bootstrap is the one wp-auto-setup.sh writes, cut from the script.
    awk '/^tracing_write_bootstrap\(\) \{/ { grab = 1; getline; next } grab && /^PHP$/ { exit } grab { print }' \
      "$here/../container/wp-auto-setup.sh" > "$work/assets/tracing/bootstrap.php"
    head -1 "$work/assets/tracing/bootstrap.php" | grep -qx '<?php' || { echo "could not cut the bootstrap out of wp-auto-setup.sh"; exit 1; }
    cp "$here/smoke/index.php" "$here/smoke/receiver.php" "$work/site/"
    in_image -v "$work/assets:/opt/struct8-assets:ro" -v "$work/site:/var/www/html" "$WORDPRESS_IMAGE" bash -euc '
      ext=/opt/struct8-assets/tracing/ext/$(uname -m)/opentelemetry.so
      [ "$(basename "$(php -r "echo PHP_EXTENSION_DIR;")")" = "$(cat /opt/struct8-assets/tracing/ext/api)" ]
      echo "extension=$ext" > /usr/local/etc/php/conf.d/zz-struct8-tracing.ini
      echo "php_admin_value auto_prepend_file /opt/struct8-assets/tracing/bootstrap.php" > /etc/apache2/conf-enabled/struct8-tracing.conf
      php -r "exit(extension_loaded(\"opentelemetry\") ? 0 : 1);" || { echo "the extension does not load"; exit 1; }
      php /opt/struct8-assets/wp-cli.phar --allow-root --version
      php -S 127.0.0.1:4318 /var/www/html/receiver.php >/tmp/receiver.log 2>&1 &
      apache2-foreground >/tmp/apache.log 2>&1 &
      for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1/ 2>/dev/null && break; sleep 1; done
      curl -fsS -H "X-Request-Start: t=$(($(date +%s%3N) - 5))" -H "X-Cdn-Distribution-Id: E2SMOKETEST" http://127.0.0.1/index.php
      for i in $(seq 1 20); do [ -s /tmp/spans.bin ] && break; sleep 1; done
      sleep 2
      show() {
        echo "--- text in the spans received"
        tr -c "[:print:]" "\n" < /tmp/spans.bin | grep -E ".{3,}" | sort -u | head -150
        echo "--- Apache and PHP log"
        tail -40 /tmp/apache.log
      }
      if grep -E "PHP (Warning|Fatal|Notice)|struct8-tracing" /tmp/apache.log; then echo "PHP wrote this while tracing"; show; exit 1; fi
      [ -s /tmp/spans.bin ] || { echo "no spans reached 127.0.0.1:4318"; show; exit 1; }
      for name in "GET /index.php" "CloudFront" "E2SMOKETEST" "wordpress" "WP.main"; do
        grep -aq "$name" /tmp/spans.bin || { echo "the spans have no \"$name\""; show; exit 1; }
      done
      echo "spans: $(stat -c %s /tmp/spans.bin) bytes, with the WordPress request span"
    '
    ;;

  *)
    echo "usage: build.sh extension <dir> | assemble <ext-dir> <archive> | smoke <archive>" >&2
    exit 2
    ;;
esac
