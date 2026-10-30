# cloud-run-hello — assets

A minimal container for a Cloud Run service whose image is built from this repository.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## What the code is

`v1/image/` is the Docker build context: a `Dockerfile` and `server.js`, a Node.js HTTP server
with no dependencies. It listens on the port in `PORT` and answers every request with JSON that
names the Cloud Run service and revision that served it, so a code change shows up as a new
revision.

## How it is used

A `cldmn_github` component points at this repository, and an Artifact Registry repository has
**Image Folder** set to `templates/cloud-run-hello/v1/image`. At apply the generator builds the
folder for linux/amd64, pushes the image under a tag made from a hash of the folder's files, and
the Cloud Run service connected to the repository runs it.
