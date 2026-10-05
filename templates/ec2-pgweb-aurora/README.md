# ec2-pgweb-aurora

EC2 bootstrap for running **pgweb** (web PostgreSQL explorer) in front of an **Aurora
PostgreSQL cluster** (`aws_rds_cluster`).

This is the Aurora counterpart of [`ec2-pgweb`](../ec2-pgweb/). The only difference is
which environment variables it reads: a wire to an Aurora cluster makes Struct8 write
`AWS_RDS_CLUSTER_*` into `/etc/struct8_env`, whereas a wire to a plain RDS instance
(`aws_db_instance`) writes `AWS_DB_INSTANCE_*`. Assets are never shared across templates
(repository README rule 4), so this is a full copy of the script with the variable names
adjusted, not a reference.

pgweb is chosen because it opens **already connected** — no login screen, no setup
wizard, no credential for the user to type. The instance reads the password from Secrets
Manager at boot, builds the connection URL, and passes it to pgweb in `DATABASE_URL`.

## Asset versions

| Template version | Asset |
|---|---|
| v1 | `v1/user_data/pgweb-aurora.sh` |

## `v1/user_data/pgweb-aurora.sh`

Amazon Linux 2023 boot script. Installs Docker and runs `sosedoff/pgweb` on port
**8081**, restarting it on reboot. Logs to `/var/log/user-data.log`.

Variables read from `/etc/struct8_env` (Aurora cluster wire):

| Variable | Purpose |
|---|---|
| `AWS_RDS_CLUSTER_ENDPOINT_0` | writer endpoint host of the cluster |
| `AWS_RDS_CLUSTER_PORT_0` | port (`5432` for PostgreSQL) |
| `AWS_RDS_CLUSTER_DB_NAME_0` | database name |
| `AWS_RDS_CLUSTER_SECRET_ARN_0` | ARN of the RDS-managed `master_user_secret` |
| `REGION` | region, for the AWS CLI calls (falls back to instance metadata) |

Optional environment overrides (read at boot, with defaults):

| Variable | Default | Purpose |
|---|---|---|
| `PGWEB_PORT` | `8081` | Host port pgweb listens on |
| `PGWEB_IMAGE` | `sosedoff/pgweb:latest` | Container image/tag |
| `PG_SSLMODE` | `require` | sslmode for the Aurora connection (Aurora needs TLS) |

> The Aurora cluster endpoint is the host alone (the port comes in its own variable),
> unlike the RDS instance endpoint which is `host:port`. The script tolerates both forms.
> The RDS-managed password is URL-encoded before going into `DATABASE_URL` because it
> contains characters (`/ @ # ? :`) that would otherwise break the URL. `sslmode` is
> `require` (encrypt without CA verification) — good for a demo; use `verify-full` with a
> CA bundle for production.

## Wiring on the diagram

- Point the EC2 instance's `user_data_file_path_` at
  `templates/ec2-pgweb-aurora/v1/user_data/pgweb-aurora.sh`.
- Wire a `cldmn_github` node naming this repository to the instance.
- Wire the instance to the Aurora cluster and enable **add environment variables** on it,
  so Struct8 writes `/etc/struct8_env`.
- Open the instance's security group ingress on the pgweb port (8081) and place the
  instance in a public subnet (or reach it over a bastion/SSM tunnel).
