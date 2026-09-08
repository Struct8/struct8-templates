'use strict';

/**
 * Lambda REGULAR (non-Edge)
 * -------------------------
 * Present in the showcase to CONTRAST with the four Lambda@Edge handlers. A
 * regular function has none of the edge restrictions:
 *  - runs in the region you deploy it to (not forced to us-east-1)
 *  - CAN read environment variables
 *  - allows larger memory and longer timeouts
 *  - is invoked directly (e.g. via a Function URL or API Gateway), not attached
 *    to a CloudFront behavior
 *
 * This one is a minimal HTTP handler suitable for a Lambda Function URL: it
 * returns JSON and echoes back a greeting. Config comes from an environment
 * variable, which Edge could not do.
 *
 * Return: an HTTP response object (Function URL / API Gateway proxy format).
 */

exports.handler = async (event) => {
  const name = process.env.GREETING_NAME || 'world';

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `hello, ${name}`,
      note: 'regular Lambda — not an edge function',
      time: new Date().toISOString(),
    }),
  };
};
