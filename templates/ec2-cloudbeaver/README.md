# ec2-cloudbeaver

Reference EC2 bootstrap for running **CloudBeaver** (DBeaver web) as a database
browser in front of an RDS/Aurora instance.

Any template that puts CloudBeaver on an EC2 instance can reuse this script by
**copying** it into its own `v1/user_data/` folder (assets are never shared across
templates — see rule 4 in the repository README).

## Asset versions

| Template version | Asset |
|---|---|
| v1 | `v1/user_data/cloudbeaver.sh` |

## `v1/user_data/cloudbeaver.sh`

Amazon Linux 2023 boot script. Installs Docker and runs `dbeaver/cloudbeaver` on
port **8978**, restarting it on reboot. Logs to `/var/log/user-data.log`.

It hardcodes nothing about the account. If the template wires the instance to the
database **and** enables "add environment variables", Struct8 writes the connection
details to `/etc/struct8_env` and the script makes CloudBeaver open **ready to use**:

1. splits the endpoint into host/port and reads the user/password from the
   RDS-managed secret via the AWS CLI (the instance role is allowed to read it), then
   writes a `data-sources.json` into the workspace;
2. skips the first-run server wizard by passing `CB_SERVER_NAME` + an admin
   (`CB_ADMIN_NAME`/`CB_ADMIN_PASSWORD`) as container env vars — without a server name
   CloudBeaver shows "Initial Server Configuration" and never loads the connection;
3. grants the connection to the anonymous team
   (`CLOUDBEAVER_APP_GRANT_CONNECTIONS_ACCESS_TO_ANONYMOUS_TEAM=true`), so the browser
   opens straight into the navigator with the connection present.

When those variables are absent, it falls back to a plain CloudBeaver and the user
does the first-run setup and adds the connection by hand.

> Note: the server is configured via container **environment variables**, not by
> replacing `cloudbeaver.conf`. Replacing the file drops fields the image needs (e.g.
> `contentRoot`), which sends the container into a restart loop with
> `Base Resource is not valid: /var/www/cloudbeaver`. Verified on CloudBeaver
> Community 26.2: `serverConfig.configurationMode=false` and the connection listed in
> `userConnections`.

Variables read from `/etc/struct8_env` (written by Struct8 when env vars are enabled):

| Variable | Purpose |
|---|---|
| `AWS_DB_INSTANCE_ENDPOINT_0` | `host:port` of the database |
| `AWS_DB_INSTANCE_DB_NAME_0` | database name |
| `AWS_DB_INSTANCE_SECRET_ARN_0` | ARN of the RDS-managed `master_user_secret` |
| `REGION` | region, for the AWS CLI calls (falls back to instance metadata) |

Optional environment overrides (read at boot, with defaults):

| Variable | Default | Purpose |
|---|---|---|
| `CLOUDBEAVER_PORT` | `8978` | Host port CloudBeaver listens on |
| `CLOUDBEAVER_IMAGE` | `dbeaver/cloudbeaver:latest` | Container image/tag |

> The instance needs permission to read the database secret. Struct8 adds this
> automatically when the instance is wired to an RDS using `manage_master_user_password`.
> CloudBeaver keeps the credentials in `data-sources.json` in plain text only until the
> first open, then encrypts them and removes them from the file.

## Wiring on the diagram

- Point the EC2 instance's `user_data_file_path_` at
  `templates/ec2-cloudbeaver/v1/user_data/cloudbeaver.sh`.
- Wire a `cldmn_github` node naming this repository to the instance.
- Open the instance's security group ingress on the CloudBeaver port (8978) and
  place the instance in a public subnet (or reach it over a bastion/SSM tunnel).
