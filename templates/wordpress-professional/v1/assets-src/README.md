# Setup assets of WordPress Professional

`../container/wp-setup-assets.tar.gz` is built from this folder. `wp-auto-setup.sh`
downloads it from the template's setup bucket on each start of a WordPress task, so a task
downloads nothing from PECL, Packagist or GitHub.

| In the archive | From |
|---|---|
| `wp-cli.phar` | the WP-CLI release in `versions.env`, checked against its SHA-256 |
| `tracing/vendor/` | `composer.lock` |
| `tracing/ext/aarch64/opentelemetry.so`, `tracing/ext/x86_64/opentelemetry.so` | the PECL release in `versions.env`, compiled in the WordPress image of `versions.env` |
| `tracing/ext/api` | the PHP extension API of that image |
| `VERSIONS` | every version above, written to the task's log at each start |

The archive is built by `.github/workflows/wordpress-setup-assets.yml` on every pull request
that touches this folder or the container folder, on an arm64 and an x86-64 runner. The run
compares the committed archive with what this folder builds and serves a traced request with
it in the WordPress image.

## Changing a version

1. Change `versions.env` or `composer.json`. For a library, delete `composer.lock` too.
2. Open a pull request. The run fails and its `wp-setup-assets` artifact holds the new
   archive and, when it was deleted, the new `composer.lock`.
3. Commit both. The next run passes when the archive matches and the request is traced.

A new WordPress image goes together into `versions.env` and the image of the `wordpress`
task definition on the template's diagram: the extension loads only in the PHP it was
compiled for, and `wp-auto-setup.sh` turns tracing off when the two differ.

`build.sh` runs the same steps on any Linux machine with Docker.
