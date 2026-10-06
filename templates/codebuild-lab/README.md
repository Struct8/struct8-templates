# codebuild-lab — assets

The repository the `codebuild-lab` template builds with AWS CodeBuild: an orders
API in Node.js, its tests, its Dockerfile, a buildspec per CodeBuild project and
a workflow for the CodeBuild-hosted GitHub Actions runner.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## How this folder is used — not like the other templates' assets

No run downloads anything from here. The other templates in this repository
point a resource at a path, and the run checks that path out for Terraform.
CodeBuild works differently: every build clones a repository, and the webhook,
the pull request checks and the Actions runner are all set up on that
repository. Only someone who administers a repository can authorize that, so the
template builds the customer's own repository, never this one.

`v1/repository/` is what goes at the root of that repository. Whoever applies the
template copies it there, and gives the template the repository's URL.

The workflow under `v1/repository/.github/workflows/` does not run here: GitHub
only runs workflows from the root `.github/workflows/` of a repository.

## v1

- `v1/repository/` — the content of the repository. Its README lists the four
  CodeBuild projects, what each one runs and what each one needs from the
  template:
  - `pr-check`, on Lambda compute: the unit tests of each pull request, with test
    and coverage reports;
  - `release`, on EC2 with Docker: the image to ECR and the release to the
    artifacts bucket;
  - `integration`, on EC2 inside the VPC: the migrations and the integration
    tests against PostgreSQL, with the password read from the secret RDS manages;
  - `codebuild-lab-runner`, on EC2 Arm: the GitHub Actions runner.

  Reads at build time:
  - `IMAGE_REPO_URL` — set by the template from the ECR repository (`release`).
  - `AWS_DB_INSTANCE_SECRET_ARN_0`, `AWS_DB_INSTANCE_ENDPOINT_0`,
    `AWS_DB_INSTANCE_DB_NAME_0` — set by the connection from the `integration`
    project to the database.
  - `CODEBUILD_SRC_DIR`, `CODEBUILD_RESOLVED_SOURCE_VERSION`,
    `CODEBUILD_BUILD_ID`, `AWS_REGION` — provided by CodeBuild.
