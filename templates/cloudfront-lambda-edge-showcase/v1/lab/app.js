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
    } else if (r.status === 200) {
      // Not a failure: the browser remembers Basic-auth credentials per origin and
      // replays the Authorization header on every request, so fetch() cannot send a
      // truly anonymous request once you have signed in. A real 401 shows only before
      // any sign-in, or from a fresh private/incognito window.
      setStatus('auth', 'wait', '200 — already signed in');
      out('auth', 'HTTP 200\nThe edge let this through because your browser is replaying saved credentials for this site — fetch() cannot drop them. This does NOT mean auth is off.\n\nTo see the real 401, open a private/incognito window and load ' + ORIGIN + '/ with no credentials (Cancel the sign-in prompt).');
    } else {
      setStatus('auth', 'fail', r.status + ' — expected 401');
      out('auth', 'HTTP ' + r.status + '\nExpected 401. The viewer-request auth function may not be active on this path yet (edge propagation can take a few minutes).');
    }
  } catch (e) { setStatus('auth', 'fail', 'network error'); out('auth', 'Request failed: ' + e.message); }
}

async function testRewrite() {
  setStatus('rewrite', 'wait', 'testing…');
  // Ask for the extensionless path "/lab". There is NO S3 object at that key — the
  // object is "lab/index.html". So a 200 is only possible because the origin-request
  // rewrite turned "/lab" into "/lab/index.html" before CloudFront reached S3. That is
  // what makes this a real test of the rewrite and not of a pre-existing object.
  // (A made-up folder like "/lab/x/" rewrites to a missing object and S3+OAC answers
  // 403 — that would test the origin, not the rewrite.)
  try {
    const r = await fetch(ORIGIN + '/lab', { cache: 'no-store' });
    if (r.ok) {
      setStatus('rewrite', 'ok', r.status + ' — resolved ✓');
      out('rewrite', 'HTTP ' + r.status + '\n"/lab" has no object of its own in S3 — the object is "lab/index.html". This 200 is only possible because the origin-request function rewrote "/lab" to "/lab/index.html". The rewrite is working.');
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

// ---------------------------------------------------------------------------
// Image gallery: public (free) vs private (signed-URL protected).
// A real use case for the trusted key group. Public images load directly;
// private ones are probed and reported as locked (403) until a signature is
// present. This section is additive and does not touch the six tests above.
// ---------------------------------------------------------------------------

const PUBLIC_IMAGES = ['photo-1.svg', 'photo-2.svg', 'photo-3.svg'];
const PRIVATE_IMAGES = ['photo-1.svg', 'photo-2.svg', 'photo-3.svg'];

function galleryTile(kind, name) {
  const url = ORIGIN + '/' + kind + '/' + name;
  const fig = document.createElement('figure');
  fig.className = 'tile ' + kind;

  const media = document.createElement('div');
  media.className = 'tile-media';
  fig.appendChild(media);

  const cap = document.createElement('figcaption');
  cap.className = 'tile-cap';
  fig.appendChild(cap);
  return { fig, media, cap, url, name };
}

function renderPublic() {
  const grid = document.getElementById('grid-public');
  grid.innerHTML = '';
  PUBLIC_IMAGES.forEach(function (name) {
    const t = galleryTile('public', name);
    const img = document.createElement('img');
    img.src = t.url;
    img.alt = name;
    img.loading = 'lazy';
    t.media.appendChild(img);

    const a = document.createElement('a');
    a.className = 'dl';
    a.href = t.url;
    a.setAttribute('download', name);
    a.textContent = '↓ download';

    const label = document.createElement('span');
    label.textContent = '/public/' + name;
    t.cap.appendChild(label);
    t.cap.appendChild(a);
    grid.appendChild(t.fig);
  });
}

async function renderPrivate() {
  const grid = document.getElementById('grid-private');
  grid.innerHTML = '';
  for (const name of PRIVATE_IMAGES) {
    const t = galleryTile('private', name);
    const status = document.createElement('span');
    status.className = 'lock';
    status.textContent = '🔒 checking…';
    t.media.appendChild(status);

    const label = document.createElement('span');
    label.textContent = '/private/' + name;
    t.cap.appendChild(label);
    grid.appendChild(t.fig);

    try {
      const r = await fetch(t.url, { cache: 'no-store' });
      if (r.status === 200) {
        // A signature is present (Fase 2): show the real image.
        t.media.innerHTML = '';
        const img = document.createElement('img');
        img.src = t.url;
        img.alt = name;
        t.media.appendChild(img);
        const a = document.createElement('a');
        a.className = 'dl';
        a.href = t.url;
        a.setAttribute('download', name);
        a.textContent = '↓ download';
        t.cap.appendChild(a);
      } else {
        status.textContent = '🔒 ' + r.status + ' — locked';
        t.fig.classList.add('locked');
      }
    } catch (e) {
      status.textContent = '🔒 unreachable';
      t.fig.classList.add('locked');
    }
  }
}

renderPublic();
renderPrivate();
