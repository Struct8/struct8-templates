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

It hardcodes nothing about the account. CloudBeaver starts empty; the user finishes
the first-run setup in the web UI and adds a connection pointing at the database
endpoint the template provisioned.

Optional environment overrides (read at boot, with defaults):

| Variable | Default | Purpose |
|---|---|---|
| `CLOUDBEAVER_PORT` | `8978` | Host port CloudBeaver listens on |
| `CLOUDBEAVER_IMAGE` | `dbeaver/cloudbeaver:latest` | Container image/tag |

## Wiring on the diagram

- Point the EC2 instance's `user_data_file_path_` at
  `templates/ec2-cloudbeaver/v1/user_data/cloudbeaver.sh`.
- Wire a `cldmn_github` node naming this repository to the instance.
- Open the instance's security group ingress on the CloudBeaver port (8978) and
  place the instance in a public subnet (or reach it over a bastion/SSM tunnel).
