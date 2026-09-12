# ec2-hub-docker — assets

Generic EC2 bootstrap that runs the **Struct8 Hub** container. Shared shape for any template
whose compute is an EC2 (or Auto Scaling group) running the Hub.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the code is

`v1/user_data/hub-docker.sh` — an EC2 `user_data` script for Amazon Linux 2023. On boot it:

1. installs Docker and git,
2. clones [`Struct8/struct8-hub`](https://github.com/Struct8/struct8-hub) and builds the
   container image from its `image/` folder — the Hub image is not published to any registry, so
   building from source keeps this independent of one,
3. runs the container, restarting it on reboot.

The Hub image is "one file, no dependencies", so the build is small and fast.

## Reusable across templates

The script hard-codes nothing about the environment — every value is a node environment variable,
read at runtime. Any template whose EC2/ASG should run the Hub points its `user_data` at a **copy**
of this file. Per the repository rules a folder is never shared between templates, so a new
template copies this script into its own tree rather than referencing this path.

## Node environment variables

The generator writes these to the instance from the diagram; set them on the EC2/Launch Template
node (`add_environment_variables_ = true`, then a labeled wire or an explicit variable):

| Variable | Default | Meaning |
|---|---|---|
| `HUB_PORT` | `8080` | Port the container listens on and publishes. Must match the container port and the target group. |
| `HUB_LOADTEST` | unset (off) | `on` enables the load-test endpoint `POST /loadtest?ms=N` (burns ~N ms of CPU). Set it only where load testing is the point. |
| `HUB_REF` | `main` | git ref of `struct8-hub` to build (branch, tag or commit). |
| `HUB_POLL` | unset | Name a wired queue for the Hub to consume (see the Hub docs). |

## How the Hub finds its neighbours

It does not read them here. The Struct8 generator injects one environment variable per wire into
`/etc/struct8_env`; the script passes that whole file into the container, and the Hub rebuilds its
neighbour list from it. The wire is the configuration.

- `GET /` is the health check and never fans out.
- `POST /` fans out to every wired neighbour and returns a per-hop report.
- `POST /loadtest?ms=N` (only when `HUB_LOADTEST=on`) spends ~N ms of CPU — for autoscaling demos.
