# ec2-pgweb

Reference EC2 bootstrap for running **pgweb** (web PostgreSQL explorer) in front of
an RDS/Aurora PostgreSQL database.

Chosen over heavier web clients because pgweb opens **already connected** — no login
screen, no setup wizard, no credential for the user to type. The instance reads the
password from Secrets Manager at boot, builds the connection URL, and passes it to
pgweb in `DATABASE_URL`. The browser just shows the tables.

Any template that puts pgweb on an EC2 instance can reuse this script by **copying**
it into its own `v1/user_data/` folder (assets are never shared across templates —
rule 4 in the repository README).

## Asset versions

| Template version | Asset |
|---|---|
| v1 | `v1/user_data/pgweb.sh` |

## `v1/user_data/pgweb.sh`

Amazon Linux 2023 boot script. Installs Docker and runs `sosedoff/pgweb` on port
**8081**, restarting it on reboot. Logs to `/var/log/user-data.log`.

It hardcodes nothing about the account. It reads the connection details Struct8
writes to `/etc/struct8_env` (requires the instance wired to the database AND "add
environment variables" enabled), fetches the user/password from the RDS-managed
secret via the AWS CLI (the instance role is allowed to read it), URL-encodes them,
and starts pgweb with `DATABASE_URL=postgres://user:pass@host:port/db?sslmode=require`.

Variables read from `/etc/struct8_env`:

| Variable | Purpose |
|---|---|
| `AWS_DB_INSTANCE_ENDPOINT_0` | `host:port` of the database |
| `AWS_DB_INSTANCE_DB_NAME_0` | database name |
| `AWS_DB_INSTANCE_SECRET_ARN_0` | ARN of the RDS-managed `master_user_secret` |
| `REGION` | region, for the AWS CLI calls (falls back to instance metadata) |

Optional environment overrides (read at boot, with defaults):

| Variable | Default | Purpose |
|---|---|---|
| `PGWEB_PORT` | `8081` | Host port pgweb listens on |
| `PGWEB_IMAGE` | `sosedoff/pgweb:latest` | Container image/tag |
| `PG_SSLMODE` | `require` | sslmode for the RDS connection (RDS needs TLS) |

> The RDS-managed password is URL-encoded before going into `DATABASE_URL` because it
> contains characters (`/ @ # ? :`) that would otherwise break the URL. `sslmode` is
> `require` (encrypt without CA verification) — good for a demo; use `verify-full`
> with a CA bundle for production.

## Wiring on the diagram

- Point the EC2 instance's `user_data_file_path_` at
  `templates/ec2-pgweb/v1/user_data/pgweb.sh`.
- Wire a `cldmn_github` node naming this repository to the instance.
- Wire the instance to the RDS and enable **add environment variables** on it, so
  Struct8 writes `/etc/struct8_env`.
- Open the instance's security group ingress on the pgweb port (8081) and place the
  instance in a public subnet (or reach it over a bastion/SSM tunnel).
