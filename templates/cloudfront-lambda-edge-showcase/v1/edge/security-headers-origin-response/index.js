'use strict';

/**
 * Lambda@Edge — ORIGIN RESPONSE
 * -----------------------------
 * Runs after the origin responds, before CloudFront caches the result. Because
 * it runs on a cache MISS, the headers it adds are cached and served on later
 * hits without invoking the function again. Classic use: inject security
 * headers (HSTS, CSP, X-Content-Type-Options...).
 *
 * NOTE (referência de decisão): para apenas ADICIONAR headers estáticos, um
 * `aws_cloudfront_response_headers_policy` faz o mesmo SEM Lambda@Edge, mais
 * barato e sem código. Use Lambda@Edge aqui quando os headers dependem de
 * lógica (valor por rota, por origem, condicional). Este handler existe como
 * exemplo do gatilho; o diagrama também mostra a policy como alternativa.
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
