# gitops-engine-runner

Boot scripts for the template that gives a customer's GitOps engine job a self-hosted
GitHub Actions runner, in the customer's own AWS account.

| Template version | Assets | Files |
|---|---|---|
| v1 | `v1/user_data/` | `runner.sh` (the runner, Ubuntu 24.04), `nat.sh` (the NAT instance, Amazon Linux 2023) |

`nat.sh` is a copy of the NAT script of `ec2-nat-private` without the port forward: no
folder is shared between templates.

## What `runner.sh` expects

It reads `/etc/struct8_env`, which the template writes from the runner node:

- `RUNNER_GITHUB_REPOSITORY`: `OWNER/REPOSITORY` of the GitOps repository.
- `RUNNER_LABEL`: the label the engine job asks for (`struct8-engine`).
- `AWS_SSM_PARAMETER_NAME_0`: the SSM parameter the person pastes the registration token
  into. A service polls it every 30 seconds and registers the runner when it finds a token.

Nothing secret lives here: the registration token is created by the person in GitHub and
travels through the SSM parameter only.
