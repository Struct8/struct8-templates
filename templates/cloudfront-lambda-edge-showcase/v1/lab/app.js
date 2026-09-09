'use strict';

// Test lab client. Kept in an external file (not inline) so it complies with the
// Content-Security-Policy the edge injects (default-src 'self' blocks inline script).

const ORIGIN = location.origin;
document.getElementById('origin').textContent = ORIGIN;
document.getElementById('origin-dot').classList.add('live');

function setStatus(id, state, text) {
  const el = document.getElementById('s-' + id);
  el.className = 'status ' + state;
  el.textContent = text;
}
function out(id, txt) { document.getElementById('out-' + id).textContent = txt; }

async function testAuth() {
  setStatus('auth', 'wait', 'testing…');
  try {
    const r = await fetch(ORIGIN + '/', { cache: 'no-store' });
    if (r.status === 401) {
      setStatus('auth', 'ok', '401 — blocked ✓');
      out('auth', 'HTTP 401 Unauthorized\nThe edge refused the request with no credentials, exactly as intended.');
    } else {
      setStatus('auth', 'fail', r.status + ' — expected 401');
      out('auth', 'HTTP ' + r.status + '\nExpected 401. The viewer-request auth function may not be active on this path yet (edge propagation can take a few minutes).');
    }
  } catch (e) { setStatus('auth', 'fail', 'network error'); out('auth', 'Request failed: ' + e.message); }
}

async function testRewrite() {
  setStatus('rewrite', 'wait', 'testing…');
  try {
    const r = await fetch(ORIGIN + '/lab/does-not-exist/', { cache: 'no-store' });
    if (r.ok) {
      setStatus('rewrite', 'ok', r.status + ' — resolved ✓');
      out('rewrite', 'HTTP ' + r.status + '\nA directory-style path resolved to index.html — the origin-request rewrite is working.');
    } else {
      setStatus('rewrite', 'fail', r.status);
      out('rewrite', 'HTTP ' + r.status + '\nExpected 200. Check the origin-request trigger on the /lab/* behavior.');
    }
  } catch (e) { setStatus('rewrite', 'fail', 'network error'); out('rewrite', 'Request failed: ' + e.message); }
}

async function testHeaders() {
  setStatus('headers', 'wait', 'testing…');
  const expected = ['strict-transport-security', 'content-security-policy',
                    'x-content-type-options', 'x-frame-options', 'referrer-policy'];
  try {
    const r = await fetch(ORIGIN + '/lab/', { cache: 'no-store' });
    const lines = expected.map(function (h) {
      const v = r.headers.get(h);
      return (v ? '✓ ' : '· ') + h + ': ' + (v || '(not visible to JS)');
    });
    const found = expected.filter(function (h) { return r.headers.get(h); }).length;
    setStatus('headers', found >= 2 ? 'ok' : 'wait', found + '/' + expected.length + ' visible');
    out('headers', lines.join('\n') + '\n\nBrowsers hide some security headers from fetch(). If one shows "(not visible to JS)", confirm it in DevTools → Network.');
  } catch (e) { setStatus('headers', 'fail', 'network error'); out('headers', 'Request failed: ' + e.message); }
}

async function testAbtest() {
  setStatus('abtest', 'wait', 'testing…');
  try {
    await fetch(ORIGIN + '/lab/', { cache: 'no-store', credentials: 'include' });
    const m = document.cookie.match(/abtest=([AB])/);
    if (m) {
      setStatus('abtest', 'ok', 'group ' + m[1] + ' ✓');
      out('abtest', 'Cookie found: abtest=' + m[1] + '\nThe viewer-response function assigned you to an A/B group.');
    } else {
      setStatus('abtest', 'wait', 'not visible to JS');
      out('abtest', 'document.cookie = ' + (document.cookie || '(empty)') + '\n\nThe cookie may be HttpOnly (invisible to JavaScript). Check DevTools → Application → Cookies for "abtest".');
    }
  } catch (e) { setStatus('abtest', 'fail', 'network error'); out('abtest', 'Request failed: ' + e.message); }
}

async function testApi() {
  setStatus('api', 'wait', 'calling…');
  try {
    const r = await fetch(ORIGIN + '/api/hello', { cache: 'no-store' });
    const txt = await r.text();
    let pretty = txt;
    try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch (_) {}
    setStatus('api', r.ok ? 'ok' : 'fail', r.status + (r.ok ? ' ✓' : ''));
    out('api', 'HTTP ' + r.status + '\n' + pretty);
  } catch (e) { setStatus('api', 'fail', 'network error'); out('api', 'Request failed: ' + e.message); }
}

async function testSigned() {
  setStatus('signed', 'wait', 'testing…');
  try {
    const r = await fetch(ORIGIN + '/premium/secret.html', { cache: 'no-store' });
    if (r.status === 403) {
      setStatus('signed', 'ok', '403 — protected ✓');
      out('signed', 'HTTP 403 (MissingKey)\nThe content refused an unsigned request — the signed-URL protection is working as intended.');
    } else {
      setStatus('signed', 'fail', r.status + ' — expected 403');
      out('signed', 'HTTP ' + r.status + '\nExpected 403. Without a valid signature this path should be refused.');
    }
  } catch (e) { setStatus('signed', 'fail', 'network error'); out('signed', 'Request failed: ' + e.message); }
}

const TESTS = { auth: testAuth, rewrite: testRewrite, headers: testHeaders,
                abtest: testAbtest, api: testApi, signed: testSigned };

document.querySelectorAll('button[data-test]').forEach(function (b) {
  b.addEventListener('click', function () { TESTS[b.dataset.test](); });
});
document.getElementById('auth-with').addEventListener('click', function () {
  const u = new URL(ORIGIN + '/');
  window.open('https://demo:demo@' + u.host + '/', '_blank');
});
document.getElementById('open-protected').addEventListener('click', function () {
  window.open(ORIGIN + '/', '_blank');
});
document.getElementById('run-all').addEventListener('click', async function () {
  await testAuth(); await testRewrite(); await testHeaders();
  await testAbtest(); await testApi(); await testSigned();
});
