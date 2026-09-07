'use strict';

/**
 * Lambda@Edge — ORIGIN REQUEST
 * ----------------------------
 * Runs only on a cache MISS, just before CloudFront goes to the origin. Because
 * it runs after the cache, it is cheaper than viewer-request for work that can
 * be cached. Classic use: URL rewriting / SPA routing.
 *
 * This handler:
 *  - maps a "clean" directory path (ending in `/`) to `/index.html`
 *  - appends `/index.html` to extensionless paths (SPA-style routing)
 * so a static site in S3 serves the right object without the browser knowing.
 *
 * Event shape: event.Records[0].cf.request
 * Return: the (possibly modified) `request`.
 */

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  let uri = request.uri;

  if (uri.endsWith('/')) {
    // /blog/ -> /blog/index.html
    uri += 'index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    // /app/route -> /app/route/index.html  (no file extension = SPA route)
    uri += '/index.html';
  }

  request.uri = uri;
  return request;
};
