# cloudfront-lambda-edge-showcase — assets

Source code shipped with the `cloudfront-lambda-edge-showcase` template — a
reference diagram for CloudFront with **Lambda@Edge across all four triggers**,
plus a regular (non-edge) Lambda for contrast, over the signed-URL CloudFront
base (KVS, keys, cache / origin-request / response-headers policies,
field-level encryption, CloudFront Function).

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

Each function is a directory with a single `index.js` (runtime `nodejs20.x`,
handler `index.handler`). No imports: the handlers use only what the managed
runtime provides, so nothing is installed at deploy time. The apply zips each
folder as it is.

### Lambda@Edge — one per trigger

| Path | Trigger | What it demonstrates |
|---|---|---|
| `v1/edge/auth-viewer-request/` | viewer-request | Auth gate before cache (Basic auth demo → 401) |
| `v1/edge/rewrite-origin-request/` | origin-request | URL rewrite / SPA routing to `/index.html` |
| `v1/edge/security-headers-origin-response/` | origin-response | Inject security headers (HSTS, CSP...) |
| `v1/edge/abtest-viewer-response/` | viewer-response | A/B cookie per viewer |

### Regular Lambda (contrast)

| Path | What it demonstrates |
|---|---|
| `v1/functions/api-regular/` | Non-edge function: reads env vars, larger memory/timeout, invoked via API Gateway v2 / Function URL |

### Test lab (static page)

| Path | What it is |
|---|---|
| `v1/lab/index.html` | A test console served BY the distribution, at `/lab/`. Because it is same-origin with the distribution, its `fetch` calls to `/api/*`, headers, rewrite and cookie run without CORS. Each card exercises one trigger and shows pass/fail. |

The lab lives on an OPEN path (`/lab/*`, no auth edge) so it can drive the tests,
while the protected content at `/` keeps the auth gate — the lab tests that gate
by opening `/` in a new tab (401 without credentials, 200 with `demo:demo`).

## Lambda@Edge constraints reflected in the code

- **No environment variables** at the edge — the edge handlers inline their
  config or read it from the request; only the regular function uses
  `process.env`.
- **Must be published** — the diagram publishes the edge functions (a numbered
  version); `$LATEST` is rejected by the service.
- **us-east-1** — Lambda@Edge functions are created in `us-east-1` regardless of
  where the distribution serves.
- **Small and fast** — viewer-* triggers run on every request/response.

## Decision note (security headers)

For adding *static* headers, an `aws_cloudfront_response_headers_policy` does the
same job **without** Lambda@Edge — cheaper and codeless. Reach for the edge
function only when the headers depend on logic. The diagram shows both so the
tradeoff is visible.

## Notes

- Public repository: no secrets. The Basic-auth values in the viewer-request
  handler are illustrative only; validate a signed token in production.
- Line endings are LF (enforced by `.gitattributes`), since the handlers run on
  the Linux Lambda runtime.
