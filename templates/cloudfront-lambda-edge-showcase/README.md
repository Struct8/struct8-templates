# cloudfront-lambda-edge-showcase — assets

Source code shipped with the `cloudfront-lambda-edge-showcase` template — a
reference diagram for CloudFront with **Lambda@Edge across all four triggers**,
plus a regular (non-edge) Lambda for contrast, over the signed-URL CloudFront
base (KVS, keys, cache / origin-request / response-headers policies,
field-level encryption, CloudFront Function).

On top of that base it also demonstrates a **real access-control use case**: a
public/private image gallery where public objects download for everyone and
private objects are gated by a CloudFront **trusted key group**, unlocked by a
one-click sign-in that issues **signed cookies**. This is the *full* version of
the showcase, as opposed to an earlier, simpler variant that only shipped the
six edge/API/signed-URL checks without the gallery or the sign-in flow.

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
| `v1/functions/api-regular/` | Non-edge function behind API Gateway v2 (`/api/*`). Reads env vars, larger memory/timeout. Routes several endpoints by path (see below). |

The regular Lambda serves three endpoints, all under the CloudFront `/api/*` behavior:

| Endpoint | What it does |
|---|---|
| `GET /api/hello` | A small JSON greeting (the original contrast endpoint). |
| `POST /api/login` | Validates `demo:demo` and mints CloudFront **signed cookies** scoped to `/private/*`. Reads the RSA private key from an SSM SecureString parameter at runtime and signs a custom policy with `crypto` (RSA-SHA1). Returns the three cookie values both as `Set-Cookie` and in the JSON body. |
| `GET /api/logout` | Clears those cookies. |

### Public / private gallery (signed-cookie access)

| Path | What it is |
|---|---|
| `v1/lab/public/*.svg` | Public sample images, served by the OPEN `/public/*` behavior — anyone downloads them. |
| `v1/lab/private/*.svg` | Private sample images, served by the `/private/*` behavior behind the trusted key group — refused (403) without a valid signature. |

The flow the gallery demonstrates: before sign-in, `/public/*` returns 200 and
`/private/*` returns 403 (`MissingKey`). Clicking **Sign in (demo:demo)** calls
`/api/login`, which signs cookies scoped to `/private/*`; the browser then sends
them automatically and the private images load (200) with no per-file signing.

> **Cookie delivery note.** `cloudfront.net` is on the Public Suffix List, so the
> `Set-Cookie` header does not reliably reach the browser through the
> CloudFront → API Gateway path. The lab therefore also reads the three signed
> values from the login JSON body and sets them with `document.cookie`
> (`path=/private`, not `HttpOnly`). With a **custom domain** you would instead
> set them as `HttpOnly` `Set-Cookie` and scope them with `Domain`.

### Test lab (static page)

| Path | What it is |
|---|---|
| `v1/lab/index.html` | The **full** test console served BY the distribution, at `/lab/`. Same-origin with the distribution, so its `fetch` calls to `/api/*`, headers, rewrite and cookie run without CORS. Six cards exercise the edge/API/signed-URL triggers; a gallery section exercises the public/private access flow. |
| `v1/lab/app.js` / `v1/lab/styles.css` | External JS/CSS (referenced with absolute `/lab/...` paths so they load regardless of trailing slash, and so the injected CSP `default-src 'self'` does not block inline script). |

The lab lives on an OPEN path (`/lab/*`, no auth edge) so it can drive the tests,
while the protected content at `/` keeps the auth gate — the lab tests that gate
by opening `/` in a new tab (401 without credentials, 200 with `demo:demo`).

## Diagram resources behind the signed-cookie flow

These are the diagram nodes that make the private gallery work, beyond the code above:

| Resource (type) | Role |
|---|---|
| `signing-key-cookies` (`aws_cloudfront_public_key`) | The RSA **public** key CloudFront uses to verify signatures. Its id is the cookies' `Key-Pair-Id`. Kept **separate** from the base `signing-key` (which serves field-level encryption / the `/premium` demo) so changing it never forces a replace of a key that is in use. |
| `subscribers-group-cookies` (`aws_cloudfront_key_group`) | Trusted key group that references the public key above; attached to the `/private/*` behavior. A request without a cookie signed by the matching private key gets 403. |
| `cf-signing-private-key` (`aws_ssm_parameter`, SecureString) | Holds the RSA **private** key. The login Lambda reads it at runtime (`ssm:GetParameter`, granted by the Lambda→parameter connection). Chosen over Secrets Manager for a lab because SSM Standard is free. |
| `/public/*` behavior | Open behavior on the protected distribution — no key group. |
| `/private/*` behavior | Behind `subscribers-group-cookies` — requires a signed cookie. |

> **Why a key pair generated outside the diagram.** CloudFront signing needs an
> RSA key pair. The `tls`/`random` Terraform providers are not in the catalog, so
> the pair is generated once and its public half goes in `encoded_key` while the
> private half goes in the SSM parameter. For production, generate/rotate the key
> outside version control (or via a provider that can create it at apply) and keep
> the private half only in a secret store — never in git. The private key here
> lives in Terraform state, which is acceptable for a demo, not for production.

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

- Public repository: **no secrets in git**. The Basic-auth values in the
  viewer-request handler are illustrative only; validate a signed token in
  production. The RSA private key used for signed cookies is NOT committed — it
  lives in the SSM SecureString parameter (and, by consequence, in Terraform
  state). Rotate it and move it to a proper secret store for production.
- Line endings are LF (enforced by `.gitattributes`), since the handlers run on
  the Linux Lambda runtime.
