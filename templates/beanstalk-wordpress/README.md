# beanstalk-wordpress — assets

WordPress on Elastic Beanstalk: a load-balanced Docker environment over two Availability
Zones, an RDS MySQL instance and an EFS file system for the uploads, so any number of
instances serve the same site.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the code is

`v1/app/` is the source bundle. The environment's `file_path_` points at it; the apply zips
it, uploads it to the bucket connected to the Elastic Beanstalk application and deploys it as
an application version.

- `docker-compose.yml` runs the official `wordpress` image on port 80.
- `.platform/hooks/prebuild/01-wordpress.sh` runs on each instance before the containers: it
  mounts the EFS file system at `/mnt/efs` and writes the passwords to
  `/opt/struct8/wordpress.env`. The file under `.platform/confighooks/` runs it again on a
  configuration change.
- `db-bootstrap.php` creates WordPress's own database user. The master user's password
  rotates every seven days, and a running site never reads it again.

## The setup script is not copied here

The first start installs WordPress with the setup script of `wordpress-professional`,
`templates/wordpress-professional/v1/container/wp-auto-setup.sh`. The container downloads it
from GitHub at a **fixed commit** and checks its SHA-256 before running it, so the version this
template runs cannot change under it, whatever happens to that folder. Rule 4 of this
repository exists because a path on a branch cannot be pinned; a commit can.

To move to a newer script, publish a `v2/` with the new commit and checksum in
`docker-compose.yml`.

## What the diagram provides

The environment reads these environment properties, all written by its connections:

| Property | Connection from the environment to |
|---|---|
| `AWS_DB_INSTANCE_ENDPOINT_0`, `AWS_DB_INSTANCE_DB_NAME_0`, `AWS_DB_INSTANCE_SECRET_ARN_0` | the RDS MySQL instance, with a managed master password |
| `AWS_EFS_FILE_SYSTEM_ID_0` | the EFS file system, with a mount target in each zone |
| `AWS_SSM_PARAMETER_NAME_ADMIN` | the SecureString SSM parameter with the administrator's password, connection label `admin` |

Optional properties, typed as `setting` entries in the `aws:elasticbeanstalk:application:environment`
namespace: `WP_SITE_TITLE`, `WP_ADMIN_USER` (default `wpadmin`), `WP_ADMIN_EMAIL`,
`WP_LOCALE`, `WP_TIMEZONE`, `WP_DEMO_CONTENT` (default `true`), `WP_SITE_URL` (the address
written at install; the site answers on the address of each request) and `APACHE_MAX_WORKERS`
(default `10`). The setup script documents each one.
