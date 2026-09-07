'use strict';

/**
 * Lambda@Edge — VIEWER REQUEST
 * ----------------------------
 * Runs at the edge for EVERY viewer request, before CloudFront checks its cache.
 * Classic use: authentication / authorization gate. Here it checks for a Basic
 * auth header and returns 401 when it is missing or wrong, otherwise lets the
 * request continue to cache/origin.
 *
 * Lambda@Edge constraints this handler respects:
 *  - No environment variables (Edge does not support them). Config is inlined
 *    or read from the request. Store secrets in a signed cookie/token instead
 *    of hard-coding real credentials — the demo value below is illustrative.
 *  - Small and fast: viewer-request runs on every hit.
 *  - The function must be published (a numbered version); $LATEST is rejected.
 *
 * Event shape: event.Records[0].cf.request
 * Return: a `request` to continue, or a `response` to short-circuit.
 */

// Demo only. In production, validate a signed token (JWT/cookie) instead of a
// static credential, and never commit real secrets to a public repo.
const DEMO_USER = 'demo';
const DEMO_PASS = 'demo';

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  const expected =
    'Basic ' + Buffer.from(`${DEMO_USER}:${DEMO_PASS}`).toString('base64');

  const provided =
    headers.authorization && headers.authorization[0]
      ? headers.authorization[0].value
      : '';

  if (provided !== expected) {
    return {
      status: '401',
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Basic' }],
        'cache-control': [{ key: 'Cache-Control', value: 'no-store' }],
      },
      body: 'Authentication required.',
    };
  }

  // Authorized: let the request proceed to cache/origin.
  return request;
};
