// Proves what wordpress.js does with the visitor settings (cookies, logged-in share, page
// popularity) and how it counts the CDN's answers. k6 is not needed: the script is run by
// Node with stand-ins for the k6 modules that record every request.
//
// Usage, from the repository root:
//   node templates/vpc-k6-load-generator/v3/test/wordpress-visitors.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "wp-visitors-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

// Stand-ins for k6/http, k6, k6/html and k6/metrics. Answers cycle through the X-Cache values
// CloudFront sends (Hit, Miss, RefreshHit, none, Error); the Miss answers set a cookie.
writeFileSync(
  join(dir, "stubs.mjs"),
  `export const log = { requests: [], jars: 0, counters: {} };
export class CookieJar { constructor() { log.jars++; } }
const xcache = ["Hit from cloudfront", "Miss from cloudfront", "RefreshHit from cloudfront", undefined, "Error from cloudfront"];
let n = 0;
function answer() {
  const i = n++ % xcache.length;
  const headers = {};
  if (xcache[i]) headers["X-Cache"] = xcache[i];
  return { status: 200, headers, cookies: i === 1 ? { woocommerce_session: [{}] } : {}, body: "", json: () => [] };
}
export const http = {
  CookieJar,
  get(url, params) { log.requests.push({ url, params }); return answer(); },
  batch(list) { list.forEach(([, url, , params]) => log.requests.push({ url, params, asset: true })); return list.map(answer); }
};
export const check = () => true;
export const sleep = () => {};
export const parseHTML = () => ({ find: () => ({ toArray: () => [] }) });
export class Counter {
  constructor(name) { this.name = name; }
  add(value, tags = {}) { const key = this.name + "|" + (tags.visitor || ""); log.counters[key] = (log.counters[key] || 0) + value; }
}
`
);
writeFileSync(
  join(dir, "wordpress.mjs"),
  readFileSync(join(here, "..", "scenarios", "wordpress.js"), "utf8")
    .replace("import http from 'k6/http';", "import { http } from './stubs.mjs';")
    .replace("import { check, sleep } from 'k6';", "import { check, sleep } from './stubs.mjs';")
    .replace("import { parseHTML } from 'k6/html';", "import { parseHTML } from './stubs.mjs';")
    .replace("import { Counter } from 'k6/metrics';", "import { Counter } from './stubs.mjs';")
);

const site = {
  posts: Array.from({ length: 50 }, (_, i) => `https://site.test/p${i + 1}/`),
  pages: ["https://site.test/a/", "https://site.test/b/"],
  categories: ["https://site.test/c/"]
};
const VISITS = 4000;

// One run in a fresh module instance (the settings are read when the script is loaded).
let load = 0;
async function run(env) {
  globalThis.__ENV = { TARGET_URL: "https://site.test/", ...env };
  const stubs = await import(pathToFileURL(join(dir, "stubs.mjs")).href);
  stubs.log.requests.length = 0;
  stubs.log.jars = 0;
  stubs.log.counters = {};
  const script = await import(pathToFileURL(join(dir, "wordpress.mjs")).href + `?load=${load++}`);
  for (let i = 0; i < VISITS; i++) script.default(site);
  const pages = stubs.log.requests.filter((r) => !r.asset);
  const posts = {};
  for (const r of pages) if (/\/p\d+\//.test(r.url)) posts[r.url] = (posts[r.url] || 0) + 1;
  const counts = Object.values(posts).sort((a, b) => b - a);
  const total = counts.reduce((s, c) => s + c, 0);
  return {
    pages,
    jars: stubs.log.jars,
    counters: stubs.log.counters,
    loggedShare: (100 * pages.filter((r) => r.params.cookies).length) / pages.length,
    top5Share: (100 * counts.slice(0, 5).reduce((s, c) => s + c, 0)) / total
  };
}

let failed = 0;
function check_(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed = 1;
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
}

const base = await run({});
check_("each visit starts with its own empty cookie jar", () => {
  assert.equal(base.jars, VISITS);
  assert.ok(base.pages.every((r) => r.params.jar));
});
check_("every visit is anonymous by default", () => assert.equal(base.loggedShare, 0));
check_("pages are picked evenly by default", () => assert.ok(base.top5Share < 20, `top 5 got ${base.top5Share.toFixed(1)}%`));
check_("CDN answers are counted by X-Cache and Set-Cookie", () => {
  const c = base.counters;
  const total = base.pages.length;
  // Hit + RefreshHit are 2 of the 5 values the stub cycles through, Miss is 1, none and Error are 2.
  assert.ok(Math.abs(c["cdn_cache_hits|anon"] / total - 0.4) < 0.01);
  assert.ok(Math.abs(c["cdn_cache_misses|anon"] / total - 0.2) < 0.01);
  assert.ok(Math.abs(c["cdn_cache_unknown|anon"] / total - 0.4) < 0.01);
  assert.equal(c["responses_with_set_cookie|anon"], c["cdn_cache_misses|anon"]);
});

const shared = await run({ VISITOR_COOKIES: "shared" });
check_("with shared cookies no jar is created and the virtual user's own is used", () => {
  assert.equal(shared.jars, 0);
  assert.ok(shared.pages.every((r) => !r.params.jar));
});

const mixed = await run({ LOGGED_IN_PCT: "10", POPULARITY: "zipf" });
check_("LOGGED_IN_PCT sends the login cookie on that share of the pages", () => {
  assert.ok(mixed.loggedShare > 7 && mixed.loggedShare < 13, `got ${mixed.loggedShare.toFixed(1)}%`);
  const cookie = mixed.pages.find((r) => r.params.cookies).params.cookies;
  assert.deepEqual(Object.keys(cookie), ["wordpress_logged_in_k6loadtest"]);
});
check_("logged-in visits are counted apart from anonymous ones", () => {
  assert.ok(mixed.counters["cdn_cache_misses|logged_in"] > 0);
  assert.ok(mixed.counters["cdn_cache_misses|anon"] > 0);
});
check_("zipf popularity gives a few pages most of the visits", () => {
  // For 50 posts and s = 1 the top 5 are 51% of the post visits.
  assert.ok(mixed.top5Share > 45 && mixed.top5Share < 58, `top 5 got ${mixed.top5Share.toFixed(1)}%`);
});

// A value the script does not accept has to stop it when it loads, not midway through a run.
for (const [name, env] of [
  ["VISITOR_COOKIES=x", { VISITOR_COOKIES: "x" }],
  ["LOGGED_IN_PCT=150", { LOGGED_IN_PCT: "150" }],
  ["POPULARITY=x", { POPULARITY: "x" }]
]) {
  let refused = false;
  try {
    await run(env);
  } catch {
    refused = true;
  }
  console.log(`${refused ? "PASS" : "FAIL"}  ${name} stops the test before it starts`);
  if (!refused) failed = 1;
}

process.exit(failed);
