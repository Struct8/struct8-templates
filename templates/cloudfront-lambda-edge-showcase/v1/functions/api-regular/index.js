'use strict';

/**
 * Lambda REGULAR (non-Edge) — API behind CloudFront /api/*
 * --------------------------------------------------------
 * Present in the showcase to CONTRAST with the four Lambda@Edge handlers. A
 * regular function has none of the edge restrictions: it runs in its region,
 * reads environment variables, and can take a longer timeout.
 *
 * The whole /api/* path is routed here (API Gateway v2, route ANY /api/{proxy+}),
 * so this one function serves several endpoints, dispatched by request path:
 *
 *   GET  /api/hello   -> a small JSON greeting (original demo endpoint)
 *   POST /api/login   -> validates demo:demo and issues CloudFront SIGNED COOKIES
 *                        scoped to /private/*, so the browser can then load the
 *                        private gallery images automatically (low friction).
 *   GET  /api/logout  -> clears those cookies.
 *
 * Signed cookies use the CloudFront trusted key group: the PUBLIC key sits in
 * aws_cloudfront_public_key; the matching PRIVATE key is read at runtime from an
 * SSM SecureString parameter (never committed to git). The Key-Pair-Id is the
 * id of that public key.
 *
 * Runtime: nodejs20.x. Uses only the managed AWS SDK v3 (@aws-sdk/client-ssm)
 * and the built-in crypto module — nothing installed at deploy time.
 */

const crypto = require('crypto');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({});

// Injected as environment variables (see the Lambda node in the diagram):
//   PRIVATE_KEY_PARAM  -> name of the SSM SecureString holding the RSA private key
//   KEY_PAIR_ID        -> id of the aws_cloudfront_public_key (e.g. K1FQMRZODJHSNZ)
//   COOKIE_DOMAIN      -> distribution domain, for the cookie Domain attribute
const PRIVATE_KEY_PARAM = process.env.PRIVATE_KEY_PARAM || '';
const KEY_PAIR_ID = process.env.KEY_PAIR_ID || '';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';

const DEMO_USER = 'demo';
const DEMO_PASS = 'demo';
const COOKIE_TTL_SECONDS = 3600; // 1 hour

// CloudFront uses a URL-safe base64 variant for its cookie values.
function cfB64(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');
}

let cachedKey = null;
async function getPrivateKey() {
  if (cachedKey) return cachedKey;
  const out = await ssm.send(
    new GetParameterCommand({ Name: PRIVATE_KEY_PARAM, WithDecryption: true })
  );
  cachedKey = out.Parameter.Value;
  return cachedKey;
}

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({ 'content-type': 'application/json' }, extraHeaders || {}),
    body: JSON.stringify(body),
  };
}

// Build the three CloudFront signed-cookie values for a custom policy that
// grants access to `resource` (a URL pattern like https://host/private/*) until
// `expires`. Returns { policy, signature, keyPairId }.
function signCookies(privateKeyPem, resource, expires) {
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Condition: { DateLessThan: { 'AWS:EpochTime': expires } },
      },
    ],
  });

  const signer = crypto.createSign('RSA-SHA1');
  signer.update(policy);
  const signature = signer.sign(privateKeyPem);

  return {
    policy: cfB64(Buffer.from(policy)),
    signature: cfB64(signature),
    keyPairId: KEY_PAIR_ID,
  };
}

function cookieAttrs() {
  // Scope the cookies to /private so they are only sent for protected content.
  // IMPORTANT: do NOT set a Domain attribute. cloudfront.net is on the Public
  // Suffix List, so browsers reject cookies that carry Domain=*.cloudfront.net
  // (anti-supercookie protection) and drop them silently. Without Domain the
  // cookie is host-only: the browser stores it for this exact distribution host
  // and sends it back same-host, which is what the lab needs. (With a custom
  // domain you could scope it with Domain; on *.cloudfront.net you must not.)
  return 'Path=/private; Secure; SameSite=Lax';
}

async function handleLogin(event) {
  // Accept credentials via Basic auth header or JSON body { user, pass }.
  let user = '';
  let pass = '';
  const auth =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    user = decoded.slice(0, i);
    pass = decoded.slice(i + 1);
  } else if (event.body) {
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      const parsed = JSON.parse(raw);
      user = parsed.user || '';
      pass = parsed.pass || '';
    } catch (_) {
      /* ignore */
    }
  }

  if (user !== DEMO_USER || pass !== DEMO_PASS) {
    return json(401, { ok: false, error: 'invalid credentials' });
  }

  if (!PRIVATE_KEY_PARAM || !KEY_PAIR_ID) {
    return json(500, {
      ok: false,
      error: 'signing not configured (PRIVATE_KEY_PARAM / KEY_PAIR_ID missing)',
    });
  }

  // The signed policy must name the DISTRIBUTION host, not the origin host. When
  // the request comes through CloudFront to API Gateway, event.headers.host is the
  // API Gateway host, which would sign a resource that never matches the real
  // /private URL. Use COOKIE_DOMAIN (the distribution domain) as the source of truth.
  const host = COOKIE_DOMAIN || (event.headers && (event.headers.host || event.headers.Host));
  const resource = 'https://' + host + '/private/*';
  const expires = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;

  const key = await getPrivateKey();
  const { policy, signature, keyPairId } = signCookies(key, resource, expires);

  const attrs = cookieAttrs();
  const maxAge = 'Max-Age=' + COOKIE_TTL_SECONDS;
  const cookies = [
    'CloudFront-Policy=' + policy + '; ' + attrs + '; ' + maxAge,
    'CloudFront-Signature=' + signature + '; ' + attrs + '; ' + maxAge,
    'CloudFront-Key-Pair-Id=' + keyPairId + '; ' + attrs + '; ' + maxAge,
  ];

  // Two ways to deliver the signed cookies, for robustness:
  //  1) `cookies` array -> API Gateway v2 turns it into Set-Cookie headers. This is
  //     the clean path, but the Set-Cookie can be stripped/altered on the way through
  //     CloudFront's /api/* behavior, so we do not rely on it alone.
  //  2) the same three values in the JSON body -> the browser sets them with
  //     document.cookie (they are not HttpOnly), which does not depend on the
  //     response header surviving the CloudFront -> API Gateway path.
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    cookies,
    body: JSON.stringify({
      ok: true,
      scope: '/private/*',
      expiresIn: COOKIE_TTL_SECONDS,
      cookies: {
        'CloudFront-Policy': policy,
        'CloudFront-Signature': signature,
        'CloudFront-Key-Pair-Id': keyPairId,
      },
    }),
  };
}

function handleLogout() {
  const attrs = cookieAttrs();
  const expired = 'Max-Age=0';
  const cookies = [
    'CloudFront-Policy=; ' + attrs + '; ' + expired,
    'CloudFront-Signature=; ' + attrs + '; ' + expired,
    'CloudFront-Key-Pair-Id=; ' + attrs + '; ' + expired,
  ];
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    cookies,
    body: JSON.stringify({ ok: true, loggedOut: true }),
  };
}

function handleHello() {
  const name = process.env.GREETING_NAME || 'world';
  return json(200, {
    message: `hello, ${name}`,
    note: 'regular Lambda — not an edge function',
    time: new Date().toISOString(),
  });
}

exports.handler = async (event) => {
  const path = (event.rawPath || event.path || '').replace(/\/+$/, '');
  const method =
    (event.requestContext &&
      event.requestContext.http &&
      event.requestContext.http.method) ||
    event.httpMethod ||
    'GET';

  try {
    if (path.endsWith('/api/login') && method === 'POST') return await handleLogin(event);
    if (path.endsWith('/api/logout')) return handleLogout();
    if (path.endsWith('/api/hello')) return handleHello();
    // Default: keep the original greeting so /api/* stays useful.
    return handleHello();
  } catch (e) {
    return json(500, { ok: false, error: String((e && e.message) || e) });
  }
};
