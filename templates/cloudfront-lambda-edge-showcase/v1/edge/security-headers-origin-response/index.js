'use strict';

/**
 * Lambda@Edge — ORIGIN RESPONSE
 * -----------------------------
 * Runs after the origin responds, before CloudFront caches the result. Because
 * it runs on a cache MISS, the headers it adds are cached and served on later
 * hits without invoking the function again. Classic use: inject security
 * headers (HSTS, CSP, X-Content-Type-Options...).
 *
 * NOTE (decision reference): to only ADD static headers, an
 * `aws_cloudfront_response_headers_policy` does the same WITHOUT Lambda@Edge,
 * cheaper and codeless. Reach for Lambda@Edge here when the headers depend on
 * logic (value per route, per origin, conditional). This handler exists as an
 * example of the trigger; the diagram also shows the policy as the alternative.
 *
 * Event shape: event.Records[0].cf.response
 * Return: the (modified) `response`.
 */

exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  const set = (name, value) => {
    headers[name.toLowerCase()] = [{ key: name, value }];
  };

  set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  set('X-Content-Type-Options', 'nosniff');
  set('X-Frame-Options', 'DENY');
  set('Referrer-Policy', 'strict-origin-when-cross-origin');
  set('Content-Security-Policy', "default-src 'self'");

  return response;
};
