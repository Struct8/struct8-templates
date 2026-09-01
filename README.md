# struct8-templates

Source code for the assets that Struct8 templates need: EC2 bootstrap scripts, Lambda
handlers, Cloudflare Worker bundles, and static files uploaded to object storage.

This repository holds **only** that code. The templates themselves — the diagrams and their
metadata — live in the Struct8 template catalog, not here.

## How the code reaches a customer's machine

Nothing here is uploaded anywhere. When a customer applies a template:

1. The template's diagram carries a GitHub node naming this repository, and each resource
   that needs code carries the path to it.
2. Compiling writes that reference into the generated Terraform as
   `.external_modules/struct8-templates/<path>`, and records this repository in the run's
   manifest.
3. The GitHub Actions run does a **sparse checkout** of this repository into that folder,
   inside the customer's own runner, and Terraform reads the files from there.

The three rules below are not style preferences. Each one exists because of a specific
behaviour of that checkout.

## Layout

```
templates/
  aws-wordpress-ha/            one folder per template, named after its catalog id
    README.md                  which template version uses which asset version
    v1/
      user-data/
        web.sh                 EC2 / Launch Template  -> one file
      lambda/
        rotate-credentials/    Lambda function        -> a directory, zipped at apply
          index.py
          requirements.txt
      site/                    S3 objects             -> a directory, one object per file
        index.html
        assets/logo.png
    v2/
      user-data/
        web.sh                 v1 stays exactly as published; v2 is a new tree
  cloudflare-edge-api/
    v1/
      worker/
        dist/
          index.js             Worker script -> the BUILT file, committed
```

Which field points at what:

| Consumer | Field on the resource | Points at |
|---|---|---|
| EC2 instance, Launch Template | `user_data_file_path_` | one file |
| Lambda function | `file_path_` | a directory of source, or a `.zip` |
| S3 object | `source_dir_` | a directory — one object per file inside |
| S3 object | `source` | one file |
| Cloudflare Worker script | `file_path_` | one built file |

Paths are relative to the repository root and written with forward slashes.

## Rules

**1. Nothing consumed sits at the repository root.**

The checkout works by directory: a file path is reduced to its parent directory first. At
the root there is no parent, the entry is dropped, and the clone succeeds while the file
never arrives. The failure surfaces much later, as Terraform not finding a file that is
plainly here on GitHub. Everything consumed lives under `templates/`.

**2. A version folder is frozen once a template that points at it is published.**

A published template records a repository, a branch and a path — and no commit. Every run
takes the top of the branch. So editing a file under `v1/` changes the code for everyone
who already downloaded the template version pointing at it, with nothing to warn them.

Changed behaviour goes into a new `v2/` tree and a new version of the template. Adding a
new file under `v1/` is safe; changing one that is already there is not. CI enforces this.

**3. The root and the intermediate folders stay light.**

The checkout also brings the loose files sitting in every directory along the path, plus
everything at the repository root — on every run, of every template, for every customer. A
README at each level is fine. A large fixture parked at the root is downloaded by people
who will never use it.

**4. No folder is shared between templates.**

A shared path becomes a dependency of many published template versions, none of which can
be pinned. Copy the file into each template's tree instead.

**5. Worker bundles are committed already built.**

The engine performs a checkout, not a build. Nothing installs dependencies or runs a
bundler in the customer's runner, so whatever is committed is what gets uploaded. If a
worker has a `package.json` with a `build` script, CI rebuilds it and fails when the
committed output differs.

For Lambdas the opposite holds: commit the source directory and let the apply zip it, which
keeps the diff readable.

**6. Line endings are LF, enforced by `.gitattributes`.**

Everything here is read by Linux: bootstrap scripts run on the instance, handlers run in
the runtime. A file committed from Windows with CRLF endings arrives with a trailing
carriage return on every line, and the failure is obscure — a shell reports
`$'\r': command not found` on a line that looks correct.

**7. Public repository, no secrets.**

Templates read credentials at run time from the secret manager they draw. What is committed
here is published, and there is no route to un-publish it from every clone.

**8. Code has to run with the values the template ships.**

If a bootstrap script needs a hostname, a bucket name or a region, it reads it from instance
metadata, from an environment variable the template sets, or from a value the template
documents as a variable. Code that only works in one account is code a customer cannot use.

## Checks

| Workflow | What it refuses |
|---|---|
| `frozen-assets` | A pull request that modifies, deletes or renames a file under an existing `templates/<id>/v<n>/` folder, and a new file added at the repository root |
| `worker-bundles` | A committed worker bundle that does not match what its source builds |

`frozen-assets` can be overridden with the `frozen-override` label on the pull request, for
the case where a published version genuinely has to change — a leaked value, for instance.
Say in the pull request why.

## Adding a template's assets

1. Create `templates/<catalog-id>/v1/`. The folder name is the id the template will have in
   the catalog; rename it only before the template is published for the first time.
2. Put the code in, at least one directory below the version folder.
3. On the diagram, point the resource's path field at it — for example
   `templates/aws-wordpress-ha/v1/user-data/web.sh`.
4. Compile **in the Struct8 app**, not only through the MCP. The MCP's compile produces the
   Terraform but does not write the deploy list that carries this repository into the
   manifest, and without it the runner clones nothing and the apply fails on a path that is
   correct.
5. Apply the template into a disposable account and check that the code actually ran.
