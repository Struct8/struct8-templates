# s3-presigned-upload — assets

Source code shipped with the `s3-presigned-upload` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

- `v1/lambda/presign/index.mjs` — Lambda handler (runtime `nodejs22.x`). Behind a
  Lambda Function URL, it returns a short-lived presigned **PUT** URL so a browser
  can upload straight to S3 without holding AWS credentials.

  Dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) are the ones
  bundled in the `nodejs22.x` managed runtime; nothing is installed at deploy time.
  The apply zips this folder as-is.

  Reads at runtime:
  - `BUCKET_NAME` — set by the diagram from the bucket id.
  - `AWS_REGION` — provided by the runtime.
  - `EXPIRES_IN` — optional, seconds the URL stays valid (default 300).
