# alb-web-servers — assets

Source code shipped with the Application Load Balancer demo template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the code is

`v1/user_data/web-info-page.sh` — an EC2 / Launch Template `user_data` script for
Amazon Linux 2023. It installs Apache and serves a styled HTML page that reports the
instance's own metadata, read **live from IMDSv2** (token-required) on every request.

The page is generated per request by a small CGI script, so a browser refresh always
shows fresh values — and behind a load balancer each refresh may land on a different
instance, so the AZ, subnet, private IP, instance id and disks visibly change. That is
the point of the demo: you *see* the load balancer spreading requests across instances
and Availability Zones.

### What it reads

Via IMDSv2: instance id, instance type, AMI, local hostname, private/public IPv4, AZ,
AZ id, region, MAC, VPC id, subnet id, security groups. From the OS: architecture,
kernel, vCPUs, memory, root disk usage and block devices, uptime.

### Reusable across templates

The script takes no arguments and hard-codes nothing about the environment — every value
is discovered at runtime. Any template with a public web tier can point an EC2 instance
or Launch Template `user_data` field at
`templates/alb-web-servers/v1/user_data/web-info-page.sh`. Per the repository rules a
folder is never shared between templates, so a new template copies this file into its own
tree rather than referencing this path.

It listens on port **80**.
