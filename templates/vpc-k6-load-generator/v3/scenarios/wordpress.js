// k6 scenario for a WordPress site: anonymous visitors browsing it.
//
// One ITERATION is one VISIT: a person lands on an entry page, reads one to
// six pages with a pause between them, and leaves. The load is set in NEW
// VISITS PER SECOND (ramping-arrival-rate), not in a fixed number of virtual
// users, so the rate keeps climbing when the site slows down -- which is what
// shows where it breaks. With a fixed number of users, a slow site would get
// fewer requests and the test would hide the limit.
//
// The URLs are read from the site itself (REST API) when the test starts, so
// the same script works on any WordPress without a list typed by hand.
//
// Read-only on purpose: no comments, no contact form, no login. A form sends
// e-mail and a comment writes to the database; both belong in a separate test.
//
// On the generator: the panel's WordPress mode, or through Debug Access
//   K6_SCENARIO=wordpress PROFILE=steps PEAK=20 TARGET_URL=https://wp.example.com/ /opt/k6/run.sh
// Anywhere else:
//   TARGET_URL=https://wp.example.com/ PROFILE=steps PEAK=20 k6 run wordpress.js
// A curve of your own (what the panel sends; STAGES in new visits per second):
//   PROFILE=curve START_RATE=0.5 STAGES='[{"target":2,"duration":"5m"}]' k6 run wordpress.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { parseHTML } from 'k6/html';
import { Counter } from 'k6/metrics';

const BASE = (__ENV.TARGET_URL || '').replace(/\/+$/, '');
const PROFILE = __ENV.PROFILE || 'steps'; // smoke | steps | soak | spike | curve
const PEAK = Number(__ENV.PEAK || 10); // new visits per second at the top of the curve
const STEPS = Number(__ENV.STEPS || 5); // steps profile: how many levels up to PEAK
const STEP_TIME = __ENV.STEP_TIME || '10m'; // time held at each level
const SOAK_TIME = __ENV.SOAK_TIME || '1h';
const THINK_MIN = Number(__ENV.THINK_MIN || 3); // seconds a person reads a page
const THINK_MAX = Number(__ENV.THINK_MAX || 10);
const MAX_VUS = Number(__ENV.MAX_VUS || 1000);
// Images, CSS and JS. Off by default: behind CloudFront they come from the
// cache and never reach WordPress. On, each visit downloads them once, like a
// browser with an empty cache.
const FETCH_ASSETS = (__ENV.FETCH_ASSETS || 'off') === 'on';
// The run stops by itself when the slowest 5% of pages (p95) take longer than
// this many seconds; 0 never stops it for slowness. The p95 counts every page
// since the start, and the check begins only after ABORT_AFTER. A test of
// autoscaling has to be allowed to go past the point where the site slows
// down: a new task, and maybe a new instance, takes minutes to join, and
// stopping at the first slow minute ends the run before it can show that.
const ABORT_P95_MS = Math.round(Number(__ENV.ABORT_P95_S || 30) * 1000);
const ABORT_AFTER = __ENV.ABORT_AFTER || '3m';

const SEARCH_WORDS = (
  __ENV.SEARCH_WORDS ||
  'cloud,photo,garden,travel,coffee,design,music,winter,ocean,city,recipe,book,light,mountain,river,news'
).split(',');

const HEADERS = {
  // Says what this traffic is, so it can be found and filtered in the logs.
  'User-Agent': 'Mozilla/5.0 (compatible; struct8-loadtest k6)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate'
};

function stages() {
  if (PROFILE === 'smoke') return [{ target: 1, duration: '2m' }];
  if (PROFILE === 'soak')
    return [
      { target: PEAK, duration: '5m' },
      { target: PEAK, duration: SOAK_TIME },
      { target: 0, duration: '2m' }
    ];
  if (PROFILE === 'spike')
    return [
      { target: Math.max(1, Math.round(PEAK / 5)), duration: '3m' },
      { target: PEAK, duration: '30s' },
      { target: PEAK, duration: '5m' },
      { target: Math.max(1, Math.round(PEAK / 5)), duration: '1m' },
      { target: Math.max(1, Math.round(PEAK / 5)), duration: '5m' }
    ];
  // steps: climb to PEAK in STEPS levels, holding each one long enough for
  // the autoscaling to act (a new task, and maybe a new instance, takes
  // minutes).
  const out = [];
  for (let i = 1; i <= STEPS; i++) {
    const rate = Math.max(1, Math.round((PEAK * i) / STEPS));
    out.push({ target: rate, duration: '1m' }, { target: rate, duration: STEP_TIME });
  }
  out.push({ target: 0, duration: '1m' });
  return out;
}

// curve profile: a shape drawn in the panel, as a k6 stage list. STAGES and
// START_RATE are in new visits per second and may have decimals (0.5 is one
// visit every two seconds). k6 takes only whole numbers of arrivals per time
// unit, so a curve is run per minute: 0.5 visits/s becomes 30 a minute.
function rate() {
  if (PROFILE !== 'curve') return { startRate: 1, timeUnit: '1s', stages: stages() };
  const curve = JSON.parse(__ENV.STAGES || '[]');
  if (!Array.isArray(curve) || curve.length === 0)
    throw new Error('PROFILE=curve needs STAGES, e.g. STAGES=\'[{"target":2,"duration":"5m"}]\'');
  const perMinute = (perSecond) => Math.round(Number(perSecond) * 60);
  return {
    startRate: perMinute(__ENV.START_RATE || 0),
    timeUnit: '1m',
    stages: curve.map((s) => ({ target: perMinute(s.target), duration: s.duration }))
  };
}

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-arrival-rate',
      ...rate(),
      preAllocatedVUs: Math.min(50, MAX_VUS),
      maxVUs: MAX_VUS,
      // A visit can last about a minute (up to six pages and five pauses), and the
      // default 30s would cut the last ones short.
      gracefulStop: '1m'
    }
  },
  discardResponseBodies: true, // saves memory; requests that need the body ask for it
  insecureSkipTLSVerify: __ENV.INSECURE_TLS === 'on',
  thresholds: {
    // The goals of a healthy site. Breaking one marks the run as failed.
    'http_req_failed{kind:page}': [
      'rate<0.01',
      // The site is down: stop instead of hammering it.
      { threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '1m' }
    ],
    'http_req_duration{kind:page}': [
      'p(95)<1500',
      ...(ABORT_P95_MS > 0
        ? [{ threshold: `p(95)<${ABORT_P95_MS}`, abortOnFail: true, delayAbortEval: ABORT_AFTER }]
        : [])
    ],
    'http_req_duration{page:home}': ['p(95)<1000'],
    'http_req_duration{page:post}': ['p(95)<1000'],
    'http_req_duration{page:page}': ['p(95)<1000'],
    'http_req_duration{page:category}': ['p(95)<1500'],
    'http_req_duration{page:search}': ['p(95)<2000'],
    // Visits k6 could not start on time: either the generator ran out of
    // users (raise MAX_VUS) or the site got so slow every user is waiting.
    dropped_iterations: ['count<100']
  }
};

const visits = new Counter('visits');

// ---------------------------------------------------------------- discovery

function listFromApi(path) {
  const links = [];
  for (let page = 1; page <= 20; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const res = http.get(`${BASE}${path}${sep}per_page=100&page=${page}`, {
      headers: { ...HEADERS, Accept: 'application/json' },
      responseType: 'text',
      tags: { kind: 'setup' }
    });
    if (res.status !== 200) break;
    const items = res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const item of items) if (item.link && (item.count === undefined || item.count > 0)) links.push(item.link);
    if (page >= Number(res.headers['X-Wp-Totalpages'] || 1)) break;
  }
  return links;
}

export function setup() {
  if (!BASE) throw new Error('TARGET_URL is required, e.g. TARGET_URL=https://wp.example.com/');
  const site = {
    posts: listFromApi('/wp-json/wp/v2/posts?_fields=link'),
    pages: listFromApi('/wp-json/wp/v2/pages?_fields=link'),
    categories: listFromApi('/wp-json/wp/v2/categories?_fields=link,count')
  };
  console.log(
    `Site read: ${site.posts.length} posts, ${site.pages.length} pages, ${site.categories.length} categories with posts.`
  );
  if (site.posts.length + site.pages.length === 0)
    console.warn('The REST API listed nothing: the visits will only see the home page and searches.');
  return site;
}

// ---------------------------------------------------------------- one visit

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// [weight, kind]: where a person goes. A kind with no URL on this site is skipped.
const ENTRY = [
  [45, 'home'],
  [35, 'post'], // arrived from a search engine or a shared link
  [15, 'page'],
  [5, 'category']
];
const NEXT = [
  [40, 'post'],
  [15, 'home'],
  [15, 'page'],
  [15, 'category'],
  [15, 'search']
];
// How many pages a visit reads: 1 (left right away) to 6.
const DEPTH = [
  [35, 1],
  [25, 2],
  [20, 3],
  [10, 4],
  [6, 5],
  [4, 6]
];

function weighted(table, usable = () => true) {
  const rows = table.filter(([, v]) => usable(v));
  let r = Math.random() * rows.reduce((s, [w]) => s + w, 0);
  for (const [w, v] of rows) if ((r -= w) < 0) return v;
  return rows[rows.length - 1][1];
}

function urlFor(kind, site) {
  switch (kind) {
    case 'post':
      return pick(site.posts);
    case 'page':
      return pick(site.pages);
    case 'category':
      return pick(site.categories);
    case 'search':
      return `${BASE}/?s=${encodeURIComponent(pick(SEARCH_WORDS))}`;
    default:
      return `${BASE}/`;
  }
}

function available(site) {
  return (kind) =>
    (kind !== 'post' || site.posts.length > 0) &&
    (kind !== 'page' || site.pages.length > 0) &&
    (kind !== 'category' || site.categories.length > 0);
}

function fetchAssets(res, seen) {
  const doc = parseHTML(res.body);
  const host = BASE.replace(/^https?:\/\//, '');
  const urls = [];
  const add = (u) => {
    if (!u || u.startsWith('data:')) return;
    const abs = u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? `${BASE}${u}` : u;
    if (abs.includes(host) && !seen.has(abs)) {
      seen.add(abs);
      urls.push(abs);
    }
  };
  doc.find('link[rel=stylesheet]').toArray().forEach((e) => add(e.attr('href')));
  doc.find('script[src]').toArray().forEach((e) => add(e.attr('src')));
  doc.find('img[src]').toArray().forEach((e) => add(e.attr('src')));
  if (urls.length === 0) return;
  // A browser opens about six connections per host.
  for (let i = 0; i < urls.length; i += 6)
    http.batch(
      urls.slice(i, i + 6).map((u) => ['GET', u, null, { headers: HEADERS, tags: { kind: 'asset', page: 'asset' } }])
    );
}

function view(kind, url, seen) {
  const res = http.get(url, {
    headers: HEADERS,
    // The body is kept only when the assets are fetched from it.
    responseType: FETCH_ASSETS ? 'text' : 'none',
    tags: { kind: 'page', page: kind }
  });
  check(res, { 'page answered 200': (r) => r.status === 200 }, { page: kind });
  if (FETCH_ASSETS && res.status === 200) fetchAssets(res, seen);
}

export default function (site) {
  visits.add(1);
  const usable = available(site);
  const depth = weighted(DEPTH);
  const seen = new Set(); // what this visitor's browser already has
  let kind = weighted(ENTRY, usable);
  for (let i = 0; i < depth; i++) {
    view(kind, urlFor(kind, site), seen);
    if (i < depth - 1) {
      sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN));
      kind = weighted(NEXT, usable);
    }
  }
}
