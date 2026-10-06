# codebuild-lab

A small orders API in Node.js, with the files AWS CodeBuild needs to test,
package and ship it. It is the repository the Struct8 `codebuild-lab` template
builds: copy this folder to the root of a repository of your own, then point the
template at that repository.

CodeBuild clones the repository on every build, and the webhooks, the pull
request checks and the GitHub Actions runner are all set up on it. That is why
the template needs a repository you administer, and cannot build this copy.

## What runs, and when

| Event | CodeBuild project | Compute | What it does |
|---|---|---|---|
| Pull request opened or updated | `pr-check` | Lambda, x86 | Unit tests. The result shows on the pull request; the test cases and the coverage go to report groups. |
| Commit on `main` | `release` | EC2, x86, Docker | Unit tests, then the image to ECR (tagged with the commit and `latest`) and a ZIP of the release to the artifacts bucket. |
| Release succeeded, and every night | `integration` | EC2 inside the VPC | Applies the migrations to PostgreSQL and runs the integration tests against it. |
| GitHub Actions job | `codebuild-lab-runner` | EC2, Arm | Runs the job of `.github/workflows/codebuild-runner.yml` on a runner CodeBuild hosts. |

## Folders

```
.github/workflows/codebuild-runner.yml   the job for the CodeBuild-hosted runner
buildspec/
  pr-check.yml                           one buildspec per project
  release.yml
  integration.yml
app/
  Dockerfile                             the image release.yml pushes
  package.json, package-lock.json
  src/                                   the API, the database pool, the migration runner
  migrations/                            SQL, applied in file name order
  scripts/secret-field.js                reads one field of the database secret
  test/unit/                             no database needed
  test/integration/                      need PostgreSQL
```

## What each project gives its buildspec

| Project | Settings |
|---|---|
| `pr-check` | Buildspec `buildspec/pr-check.yml`. Image `aws/codebuild/amazonlinux-x86_64-lambda-standard:nodejs22`. |
| `release` | Buildspec `buildspec/release.yml`. Privileged mode on. Variable `IMAGE_REPO_URL`: the repository URL of the ECR repository, without a tag. The repository must let `latest` be overwritten (tag mutability `MUTABLE`). |
| `integration` | Buildspec `buildspec/integration.yml`. Runs in subnets with a route to the internet. The connection to the database gives it `AWS_DB_INSTANCE_SECRET_ARN_0`, `AWS_DB_INSTANCE_ENDPOINT_0` and `AWS_DB_INSTANCE_DB_NAME_0`; `DB_SECRET_ARN`, `DB_ENDPOINT` and `DB_NAME` take their place when set. |
| `codebuild-lab-runner` | Its name is part of the `runs-on` label in the workflow, so a different name needs that line changed too. |

The database password is read from Secrets Manager during the build. It is not
stored in the repository or in the project.

## Running it on your machine

```bash
cd app
npm ci
npm run test:unit
```

The integration tests and the API need a PostgreSQL database, given through the
standard variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE`
(set `PGSSLMODE=disable` for a local database without TLS):

```bash
npm run migrate
npm run test:integration
npm start
```
