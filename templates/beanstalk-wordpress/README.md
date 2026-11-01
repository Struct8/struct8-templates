# beanstalk-wordpress — assets

WordPress on Elastic Beanstalk: a load-balanced Docker environment over two Availability
Zones, an RDS MySQL instance and an EFS file system for the uploads, so any number of
instances serve the same site.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |
| v2 | `v2/` |

`v2/` mounts the file system through the access point of the environment's connection to it,
and lets two environments share one RDS instance and one file system.

## What the code is

`v2/app/` is the source bundle (`v1/app/` in the first version). The environment's `file_path_` points at it; the apply zips
it, uploads it to the bucket connected to the Elastic Beanstalk application and deploys it as
an application version.

- `docker-compose.yml` runs the official `wordpress` image on port 80.
- `.platform/hooks/prebuild/01-wordpress.sh` runs on each instance before the containers: it
  mounts the EFS file system at `/mnt/efs` and writes the database name and user and the
  passwords to `/opt/struct8/wordpress.env`. In `v2/`, with an access point on the connection,
  it installs the EFS mount helper (`amazon-efs-utils`) and mounts through the access point
  over TLS; `/mnt/efs` is then the access point's directory. Without one, it mounts the root
  of the file system, as `v1/` does. The file under `.platform/confighooks/` runs it again on a
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
| `AWS_EFS_ACCESS_POINT_ID_0` (`v2/`) | the same connection, when its access point is on |
| `AWS_SSM_PARAMETER_NAME_ADMIN` | the SecureString SSM parameter with the administrator's password, connection label `admin` |

Optional properties, typed as `setting` entries in the `aws:elasticbeanstalk:application:environment`
namespace: `WP_SITE_TITLE`, `WP_ADMIN_USER` (default `wpadmin`), `WP_ADMIN_EMAIL`,
`WP_LOCALE`, `WP_TIMEZONE`, `WP_DEMO_CONTENT` (default `true`), `WP_SITE_URL` (the address
written at install; the site answers on the address of each request) and `APACHE_MAX_WORKERS`
(default `10`). The setup script documents each one.

`v2/` reads two more: `WORDPRESS_DB_NAME` (default: the RDS instance's initial database) and
`WORDPRESS_DB_USER` (default `wordpress`), each made of letters, digits and `_`, up to 32. Two
environments that share one RDS instance set a different pair each: the hook sets the user's
password on every deployment, so two sites with the same user would overwrite each other's.

A deployment never swaps a mount the running site holds. Moving an environment from the root
of the file system to an access point takes new instances: rebuild the environment, or
replace its instances.
