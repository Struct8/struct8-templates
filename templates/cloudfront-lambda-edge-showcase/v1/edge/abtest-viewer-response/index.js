'use strict';

/**
 * Lambda@Edge — VIEWER RESPONSE
 * -----------------------------
 * Runs just before CloudFront returns the response to the viewer. It is the last
 * hook and, like viewer-request, runs on every response (its output is not
 * cached). Classic use: per-viewer personalization — set an A/B testing cookie
 * so a returning visitor stays in the same bucket.
 *
 * This handler assigns the viewer to group A or B and pins it with a cookie, if
 * one is not already set. It does not read secrets and does not vary the cache
 * key (the split is expressed only in the Set-Cookie sent to the browser).
 *
 * Event shape:
 *   event.Records[0].cf.request  (to read existing cookies)
 *   event.Records[0].cf.response (to add Set-Cookie)
 * Return: the (modified) `response`.
 */

const COOKIE = 'abtest';

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;

  const cookieHeader =
    request.headers.cookie && request.headers.cookie[0]
      ? request.headers.cookie[0].value
      : '';

  const already = cookieHeader.split(';').some((c) => c.trim().startsWith(`${COOKIE}=`));

  if (!already) {
    const group = Math.random() < 0.5 ? 'A' : 'B';
    const setCookie = `${COOKIE}=${group}; Path=/; Max-Age=2592000; Secure; SameSite=Lax`;
    response.headers['set-cookie'] = (response.headers['set-cookie'] || []).concat([
      { key: 'Set-Cookie', value: setCookie },
    ]);
  }

  return response;
};
