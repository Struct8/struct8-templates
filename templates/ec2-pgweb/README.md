# ec2-pgweb

EC2 bootstrap for running **pgweb** (web PostgreSQL explorer) in front of a PostgreSQL
database. Works with **both** a plain RDS instance (`aws_db_instance`) and an Aurora
cluster (`aws_rds_cluster`): the script detects which one the EC2 is wired to from the
environment variables Struct8 writes, so one asset serves both templates.

Chosen over heavier web clients because pgweb opens **already connected** — no login
screen, no setup wizard, no credential for the user to type. The instance reads the
password from Secrets Manager at boot and starts pgweb pointed at the database.

Any template that puts pgweb on an EC2 instance can reuse this script by **copying** it
into its own `v1/user_data/` folder (assets are never shared across templates — rule 4
in the repository README).

## Asset versions

| Template version | Asset |
|---|---|
| v1 | `v1/user_data/pgweb.sh` |

## `v1/user_data/pgweb.sh`

Amazon Linux 2023 boot script. Installs Docker and runs `sosedoff/pgweb` on port
**8081**, restarting it on reboot. Logs to `/var/log/user-data.log`.

It reads the connection details Struct8 writes to `/etc/struct8_env` (requires the
instance wired to the database AND "add environment variables" enabled), fetches the
user/password from the RDS-managed secret via the AWS CLI (the instance role is allowed
to read it), and starts pgweb.

Variables read from `/etc/struct8_env` — **one set or the other, auto-detected**:

| RDS instance (`aws_db_instance`) | Aurora cluster (`aws_rds_cluster`) | Purpose |
|---|---|---|
| `AWS_DB_INSTANCE_ENDPOINT_0` | `AWS_RDS_CLUSTER_ENDPOINT_0` | database host (RDS: `host:port`, Aurora: host only) |
| — | `AWS_RDS_CLUSTER_PORT_0` | port (Aurora carries it separately; RDS has it in the endpoint) |
| `AWS_DB_INSTANCE_DB_NAME_0` | `AWS_RDS_CLUSTER_DB_NAME_0` | database name |
| `AWS_DB_INSTANCE_SECRET_ARN_0` | `AWS_RDS_CLUSTER_SECRET_ARN_0` | ARN of the RDS-managed `master_user_secret` |
| `REGION` | `REGION` | region, for the AWS CLI calls (falls back to instance metadata) |

Optional environment overrides (read at boot, with defaults):

| Variable | Default | Purpose |
|---|---|---|
| `PGWEB_PORT` | `8081` | Host port pgweb listens on |
| `PGWEB_IMAGE` | `sosedoff/pgweb:latest` | Container image/tag |
| `PG_SSLMODE` | `require` | sslmode for the connection (RDS/Aurora need TLS) |

> **Credentials are passed to pgweb as separate flags with the RAW password, not as a
> `DATABASE_URL`.** RDS-managed passwords contain characters (`/ @ # ? : | ( >`) and
> pgweb does not reliably percent-decode a password embedded in the connection URL —
> a URL-encoded password arrives wrong and pgweb loops on `authentication failed`.
> Separate `--host/--port/--user/--pass/--db/--ssl` flags avoid URL parsing entirely.
> The password reaches the container through an env var expanded inside the container's
> shell, so it never appears in `argv`/`docker inspect`. `sslmode` is `require` (encrypt
> without CA verification) — good for a demo; use `verify-full` with a CA bundle in prod.

## Wiring on the diagram

- Point the EC2 instance's `user_data_file_path_` at
  `templates/ec2-pgweb/v1/user_data/pgweb.sh`.
- Wire a `cldmn_github` node naming this repository to the instance.
- Wire the instance to the RDS instance or Aurora cluster and enable **add environment
  variables** on it, so Struct8 writes `/etc/struct8_env`.
- Open the instance's security group ingress on the pgweb port (8081) and place the
  instance in a public subnet (or reach it over a bastion/SSM tunnel).
