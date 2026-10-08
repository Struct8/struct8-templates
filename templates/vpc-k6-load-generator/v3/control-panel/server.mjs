#!/usr/bin/env node
// k6 Control Panel -- a small web UI to configure, start and stop k6 runs.
//
// WHY THIS EXISTS
// The grafana/k6 image ships a live dashboard (port 5665) that only SHOWS a run in progress; it
// cannot configure one, start it or stop it. This panel is the missing half: a form for the
// target, VUs, duration, rate and method, Start/Stop buttons, the run output, and a link into the
// live dashboard while a run is going. One file, Node built-ins only -- no npm install -- so it
// starts on a clean Amazon Linux as soon as Node and Docker are present.
//
// HOW IT DRIVES k6
// Start -> `docker run -d --name k6-run ... grafana/k6 run /scripts/load-test.js`, the knobs passed
// as -e flags exactly like /opt/k6/run.sh does. Stop -> `docker stop k6-run`. Status -> `docker
// inspect` on that one container. The test script is the one the bootstrap wrote to
// /opt/k6/scripts, so a run started here and a run started through Debug Access are the same test.
// The container is kept after it stops (no --rm) so the output of the last run stays readable.
//
// SCENARIOS (v3)
// Constant and Curve run the single-URL test, exactly as in v2. WordPress runs
// /opt/k6/scripts/wordpress.js: visitors browsing the site, with the load set in new visits per
// second. It is offered only when the bootstrap managed to download that script.
//
// SECURITY
// This template is a short-lived teaching lab, so the panel is meant to be reachable from anywhere
// (port 80 open to 0.0.0.0/0). Whoever reaches it can fire load FROM this instance at any URL. Two
// guards bound that:
//   * K6_PANEL_TOKEN -- when set, every /api call must carry it (header x-panel-token). Unset means
//     no authentication at all.
//   * K6_PANEL_MAX_VUS / K6_PANEL_MAX_DURATION / K6_PANEL_MAX_RATE -- ceilings on what a single
//     run may ask for (K6_PANEL_MAX_RATE is the WordPress peak, in new visits per second).
// Every form value is validated and handed to docker as an argument array, never a shell string,
// so a value cannot become a command.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const env = process.env;

const PORT = Number(env.K6_PANEL_PORT ?? 80);
const K6_IMAGE = env.K6_IMAGE ?? "grafana/k6";
const CONTAINER = "k6-run";
const SCRIPT_PATH = env.K6_SCRIPT ?? "/opt/k6/scripts/load-test.js";
const WORDPRESS_SCRIPT = join(dirname(SCRIPT_PATH), "wordpress.js");
const REPORT_DIR = env.K6_REPORT_DIR ?? "/opt/k6/report";
const PLATFORM_FILE = env.K6_PLATFORM_FILE ?? "/opt/k6/platform";
const DASHBOARD_PORT = Number(env.DASHBOARD_PORT ?? 5665);
const TOKEN = (env.K6_PANEL_TOKEN ?? "").trim();
const MAX_VUS = positiveInt(env.K6_PANEL_MAX_VUS, 500);
const MAX_DURATION_S = positiveInt(env.K6_PANEL_MAX_DURATION, 3600);
const MAX_RATE = positiveInt(env.K6_PANEL_MAX_RATE, 100);

function positiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// --- helpers ------------------------------------------------------------------------------------

function run(cmd, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

function readTrimmed(path) {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

// Targets offered in the form as ready-made chips, best first.
//
// Two sources, in order:
//   1. TARGET_URL -- a full URL set on the node environment. This is the way to pre-fill the
//      target when the generator is NOT wired to its target: the node declares TARGET_URL (often
//      a Terraform interpolation, e.g. "http://${aws_lb.my-alb.dns_name}/loadtest?ms=80"), and the
//      panel offers it as the first suggestion and pre-fills the field with it. It is a whole URL,
//      used verbatim, so it can carry a path and a query (…/loadtest?ms=80), unlike a wire.
//   2. AWS_LB_DNSNAME_* -- one variable per wire leaving this instance (a wired load balancer),
//      written by the generator. Each becomes http://<dns>/.
//
// The list is de-duplicated, keeping the first occurrence, so a TARGET_URL that happens to match a
// wired LB is not offered twice.
function suggestedTargets() {
  const out = [];
  const targetUrl = String(env.TARGET_URL ?? "").trim();
  if (targetUrl && isHttpUrl(targetUrl)) out.push(targetUrl);
  for (const [k, v] of Object.entries(env)) {
    if (/^AWS_LB_DNSNAME_/.test(k) && v) out.push(`http://${v}/`);
  }
  return [...new Set(out)];
}

function isHttpUrl(text) {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// "1h30m10s" -> seconds. Returns NaN when the string is not a k6 duration.
function durationSeconds(text) {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
  if (!m || text === "") return Number.NaN;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function tokenOk(req) {
  if (!TOKEN) return true;
  const given = Buffer.from(String(req.headers["x-panel-token"] ?? ""));
  const want = Buffer.from(TOKEN);
  return given.length === want.length && timingSafeEqual(given, want);
}

// --- validation ---------------------------------------------------------------------------------
// The messages are shown to the person in the form, so they are written for a human.

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);

function validate(input) {
  const errors = [];

  const targetUrl = String(input.targetUrl ?? "").trim();
  try {
    const u = new URL(targetUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") errors.push("Target URL must start with http:// or https://.");
  } catch {
    errors.push("Target URL is missing or not a valid URL.");
  }

  if (input.scenario === "wordpress") {
    if (!existsSync(WORDPRESS_SCRIPT)) errors.push("The WordPress scenario is not on this instance: the bootstrap could not download it.");
    return { errors, config: { targetUrl, ...validateWordpress(input, errors) } };
  }

  const method = String(input.method ?? "GET").trim().toUpperCase();
  if (!METHODS.has(method)) errors.push(`Method must be one of ${[...METHODS].join(", ")}.`);

  const body = String(input.body ?? "");
  if (body.length > 10000) errors.push("Body is limited to 10000 characters.");

  const common = { targetUrl, method, body };
  if (input.mode === "curve") {
    const curve = validateCurve(input.points, errors);
    return { errors, config: { ...common, mode: "curve", ...curve } };
  }

  const vus = Number(input.vus);
  if (!Number.isInteger(vus) || vus < 1 || vus > MAX_VUS) errors.push(`VUs must be a whole number from 1 to ${MAX_VUS}.`);

  const duration = String(input.duration ?? "").trim();
  const seconds = durationSeconds(duration);
  if (!Number.isFinite(seconds) || seconds < 1) errors.push("Duration must look like 30s, 5m, 1h or 1m30s.");
  else if (seconds > MAX_DURATION_S) errors.push(`Duration is capped at ${MAX_DURATION_S} seconds on this panel.`);

  const rpsText = String(input.rps ?? "").trim();
  const rps = rpsText === "" ? 0 : Number(rpsText);
  if (rpsText !== "" && (!Number.isInteger(rps) || rps < 1 || rps > 100000)) errors.push("Rate, when set, must be a whole number from 1 to 100000.");

  return { errors, config: { ...common, mode: "constant", vus, duration, rps } };
}

// WordPress scenario. The load is new visits per second, shaped by a profile; the total length
// is computed the way wordpress.js lays out its stages, so the duration cap applies to it too.
const PROFILES = new Set(["smoke", "steps", "spike", "soak"]);

function wordpressSeconds({ profile, steps, stepSeconds, soakSeconds }) {
  if (profile === "smoke") return 120;
  if (profile === "spike") return 180 + 30 + 300 + 60 + 300;
  if (profile === "soak") return 300 + soakSeconds + 120;
  return steps * (60 + stepSeconds) + 60;
}

function validateWordpress(input, errors) {
  const profile = String(input.profile ?? "steps");
  if (!PROFILES.has(profile)) errors.push("Load shape must be smoke, steps, spike or soak.");

  const peak = Number(input.peak);
  if (profile !== "smoke" && (!Number.isInteger(peak) || peak < 1 || peak > MAX_RATE))
    errors.push(`Peak must be a whole number of new visits per second, from 1 to ${MAX_RATE}.`);

  const steps = Number(input.steps ?? 5);
  if (profile === "steps" && (!Number.isInteger(steps) || steps < 1 || steps > 10)) errors.push("Steps must be a whole number from 1 to 10.");

  const stepTime = String(input.stepTime ?? "10m").trim();
  const stepSeconds = durationSeconds(stepTime);
  if (profile === "steps" && (!Number.isFinite(stepSeconds) || stepSeconds < 10)) errors.push("Time at each step must look like 30s, 10m or 1h, and be at least 10s.");

  const soakTime = String(input.soakTime ?? "30m").trim();
  const soakSeconds = durationSeconds(soakTime);
  if (profile === "soak" && (!Number.isFinite(soakSeconds) || soakSeconds < 10)) errors.push("Time at the peak must look like 30m or 1h, and be at least 10s.");

  const thinkMin = Number(input.thinkMin ?? 3);
  const thinkMax = Number(input.thinkMax ?? 10);
  if (!Number.isFinite(thinkMin) || !Number.isFinite(thinkMax) || thinkMin < 0 || thinkMax > 120 || thinkMin > thinkMax)
    errors.push("Reading time must go from a minimum to a maximum between 0 and 120 seconds.");

  const totalSeconds = wordpressSeconds({ profile, steps, stepSeconds, soakSeconds });
  if (Number.isFinite(totalSeconds) && totalSeconds > MAX_DURATION_S)
    errors.push(`This run would take ${Math.ceil(totalSeconds / 60)} min; the panel allows ${Math.floor(MAX_DURATION_S / 60)} min (K6_PANEL_MAX_DURATION).`);

  return {
    scenario: "wordpress",
    profile,
    peak,
    steps,
    stepTime,
    soakTime,
    thinkMin,
    thinkMax,
    fetchAssets: input.fetchAssets === true,
    totalSeconds,
  };
}

// Curve mode. The editor sends points in ABSOLUTE time -- {t: seconds since start, vus} -- which
// is what a person draws. k6's ramping-vus wants the opposite shape: a start level and a list of
// stages, each "reach this target over this long". The conversion happens here, after validation,
// so the browser can never hand k6 a stage list the panel did not check.
const MAX_POINTS = 50;

function validateCurve(raw, errors) {
  if (!Array.isArray(raw) || raw.length < 2) {
    errors.push("A curve needs at least two points.");
    return { points: [], stages: [], startVus: 0, totalSeconds: 0, peakVus: 0 };
  }
  if (raw.length > MAX_POINTS) errors.push(`A curve is limited to ${MAX_POINTS} points.`);

  const points = raw.map((p) => ({ t: Number(p?.t), vus: Number(p?.vus) }));
  points.forEach((p, i) => {
    if (!Number.isInteger(p.t) || p.t < 0) errors.push(`Point ${i + 1}: time must be a whole number of seconds.`);
    if (!Number.isInteger(p.vus) || p.vus < 0 || p.vus > MAX_VUS) errors.push(`Point ${i + 1}: VUs must be a whole number from 0 to ${MAX_VUS}.`);
  });
  if (points[0].t !== 0) errors.push("The first point must be at time 0.");
  for (let i = 1; i < points.length; i++) {
    if (points[i].t <= points[i - 1].t) {
      errors.push(`Point ${i + 1} must come later than point ${i}.`);
      break;
    }
  }

  const totalSeconds = points[points.length - 1].t;
  if (totalSeconds > MAX_DURATION_S) errors.push(`The curve is capped at ${MAX_DURATION_S} seconds on this panel.`);
  const peakVus = Math.max(...points.map((p) => p.vus));
  if (peakVus < 1) errors.push("The curve never goes above 0 VUs, so nothing would run.");

  const stages = points.slice(1).map((p, i) => ({ target: p.vus, duration: `${p.t - points[i].t}s` }));
  return { points, stages, startVus: points[0].vus, totalSeconds, peakVus };
}

// --- k6 lifecycle -------------------------------------------------------------------------------

async function status() {
  const res = await run("docker", ["inspect", "-f", "{{.State.Running}}|{{.State.ExitCode}}|{{.State.FinishedAt}}", CONTAINER]);
  if (!res.ok) return { running: false, lastRun: null };
  const [running, exitCode, finishedAt] = res.stdout.trim().split("|");
  return {
    running: running === "true",
    lastRun: running === "true" ? null : { exitCode: Number(exitCode), finishedAt },
  };
}

async function logs(tail) {
  const res = await run("docker", ["logs", "--tail", String(tail), CONTAINER], 10000);
  // k6 prints its progress on stderr, so both streams are the output.
  return `${res.stdout}${res.stderr}`;
}

// Reads how the run is going out of k6's own output. A test can be green in the panel (container
// up, dashboard served) while every request fails -- a wrong port, path or host. This turns that
// into a number the UI can alarm on, live, and a verdict once the run ends.
//
//   * Final summary (after the run): `http_req_failed......: 100.00% 31359 out of 31359`.
//   * During the run: k6 logs one `level=warning msg="Request Failed" error="..."` per failure,
//     and the periodic `running (..), N/M VUs, X complete and Y interrupted iterations` line. A
//     burst of warnings with almost no completed iterations is a run hitting nothing.
function health(logText) {
  const summary = /http_req_failed[.\s]*:\s*([\d.]+)%\s*(\d+)\s*out of\s*(\d+)/.exec(logText);
  if (summary) {
    const failRate = Number(summary[1]) / 100;
    return { failRate, failed: Number(summary[2]), total: Number(summary[3]), sampleError: firstError(logText), source: "summary" };
  }

  // No final summary yet -- judge the run as it goes. k6 DOES log a `Request Failed` warning per
  // failure in real time (confirmed: they are in `docker logs` seconds into a run), so a failing
  // target is visible almost immediately rather than only at the end.
  const warnings = (logText.match(/level=warning msg="Request Failed"/g) || []).length;
  if (warnings === 0) return null;

  // The subtlety: k6 counts a connection-refused request as a COMPLETED iteration (the iteration
  // ran, its check failed), so `complete` climbs alongside the warnings and warnings/(complete+
  // warnings) sits near 0.5 even when nothing is actually being answered. That diluted the signal
  // and kept the alert below its threshold. So the live rate is warnings against the SUCCESSFUL
  // checks instead -- a run where everything fails has many warnings and ~zero passing checks.
  const checks = /✓|✗|checks[.\s]*:\s*([\d.]+)%/.exec(logText);
  const passPct = checks && checks[1] !== undefined ? Number(checks[1]) : null;
  const prog = [...logText.matchAll(/running \([^)]*\),\s*[\d/]+ VUs,\s*(\d+)\s+complete/g)];
  const complete = prog.length ? Number(prog[prog.length - 1][1]) : 0;

  // Passing checks is the count of requests that actually got a 2xx/3xx. When the summary's
  // percentage is not out yet, approximate it: completed iterations minus the failures seen.
  const passed = passPct !== null ? Math.round((complete * passPct) / 100) : Math.max(0, complete - warnings);
  const total = passed + warnings;
  const failRate = total === 0 ? 1 : warnings / total;

  return { failRate, failed: warnings, total, sampleError: firstError(logText), source: "live" };
}

function firstError(logText) {
  const m = /msg="Request Failed"\s+error="(.+)"/.exec(logText);
  if (!m) return null;
  // Classify on the whole error line, not a prefix: k6 embeds the URL in escaped quotes
  // (error="Get \"http://..\": lookup .. no such host"), so slicing at the first quote loses the cause.
  const err = m[1].replace(/\\"/g, '"');
  if (/no such host|lookup .* on .*:53/.test(err)) return "DNS does not resolve the host in the URL — check the hostname.";
  if (/connection refused/.test(err)) return "Connection refused — the host is up but nothing listens on that port.";
  if (/i\/o timeout|context deadline exceeded/.test(err)) return "Connection timed out — wrong port, or a security group is blocking it.";
  if (/tls|x509|certificate/i.test(err)) return "TLS error — try http:// instead of https://, or check the certificate.";
  return err.length > 160 ? err.slice(0, 160) + "…" : err;
}

function prepareReportDir() {
  // The grafana/k6 container runs as a non-root uid; the HTML export fails unless the mounted
  // directory is world-writable.
  mkdirSync(REPORT_DIR, { recursive: true });
  chmodSync(REPORT_DIR, 0o777);
}

async function start(cfg) {
  prepareReportDir();
  // A stopped container from the previous run still holds the name; clear it first.
  await run("docker", ["rm", "-f", CONTAINER]);

  const platform = readTrimmed(PLATFORM_FILE);
  const args = ["run", "-d", "--name", CONTAINER];
  if (platform) args.push("--platform", platform);
  args.push("-p", `${DASHBOARD_PORT}:${DASHBOARD_PORT}`, "-e", `TARGET_URL=${cfg.targetUrl}`);
  const script = cfg.scenario === "wordpress" ? WORDPRESS_SCRIPT : SCRIPT_PATH;
  if (cfg.scenario === "wordpress") {
    args.push(
      "-e", `PROFILE=${cfg.profile}`,
      "-e", `PEAK=${cfg.peak}`,
      "-e", `STEPS=${cfg.steps}`,
      "-e", `STEP_TIME=${cfg.stepTime}`,
      "-e", `SOAK_TIME=${cfg.soakTime}`,
      "-e", `THINK_MIN=${cfg.thinkMin}`,
      "-e", `THINK_MAX=${cfg.thinkMax}`,
      "-e", `MAX_VUS=${MAX_VUS}`,
      "-e", `FETCH_ASSETS=${cfg.fetchAssets ? "on" : "off"}`,
    );
  } else {
    // The single-URL test, exactly as v2 runs it.
    args.push("-e", `METHOD=${cfg.method}`);
    if (cfg.mode === "curve") {
      // The test script switches to the ramping-vus executor when STAGES is present.
      args.push("-e", `STAGES=${JSON.stringify(cfg.stages)}`, "-e", `START_VUS=${cfg.startVus}`);
    } else {
      args.push("-e", `VUS=${cfg.vus}`, "-e", `DURATION=${cfg.duration}`);
      if (cfg.rps > 0) args.push("-e", `RPS=${cfg.rps}`);
    }
    if (cfg.body) args.push("-e", `BODY=${cfg.body}`);
  }
  args.push(
    "-e", "K6_WEB_DASHBOARD=true",
    "-e", "K6_WEB_DASHBOARD_HOST=0.0.0.0",
    "-e", `K6_WEB_DASHBOARD_PORT=${DASHBOARD_PORT}`,
    "-e", "K6_WEB_DASHBOARD_EXPORT=/report/index.html",
    "-v", `${REPORT_DIR}:/report`,
    "-v", `${dirname(SCRIPT_PATH)}:/scripts:ro`,
    // K6_WEB_DASHBOARD=true is what turns the dashboard on. Adding `--out web-dashboard` as well
    // starts a second one on the same port, which fails with "address already in use".
    K6_IMAGE, "run", `/scripts/${basename(script)}`,
  );
  return run("docker", args, 30000);
}

const stop = () => run("docker", ["stop", CONTAINER], 30000);

// --- HTTP ---------------------------------------------------------------------------------------

function send(res, status, body, type = "application/json") {
  const text = type === "application/json" ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "content-type": type,
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store",
  });
  res.end(text);
}

async function readJson(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("request body too large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function route(req, res) {
  const path = new URL(req.url ?? "/", "http://local").pathname;

  if (req.method === "GET" && (path === "/" || path === "/index.html")) {
    send(res, 200, readFileSync(join(HERE, "index.html"), "utf8"), "text/html; charset=utf-8");
    return;
  }

  // The last run's HTML report, written by k6 when a run ends.
  if (req.method === "GET" && path === "/report") {
    const file = join(REPORT_DIR, "index.html");
    if (existsSync(file)) send(res, 200, readFileSync(file, "utf8"), "text/html; charset=utf-8");
    else send(res, 404, "No report yet. One is written when a run finishes.", "text/plain; charset=utf-8");
    return;
  }

  if (!path.startsWith("/api/")) {
    send(res, 404, { error: "not found" });
    return;
  }
  if (!tokenOk(req)) {
    send(res, 401, { error: "This panel needs its access token." });
    return;
  }

  if (req.method === "GET" && path === "/api/status") {
    const s = await status();
    const logText = s.running || s.lastRun ? await logs(300) : "";
    send(res, 200, {
      ...s,
      logs: logText.length > 20000 ? logText.slice(-20000) : logText,
      health: logText ? health(logText) : null,
      dashboardPort: DASHBOARD_PORT,
      platform: readTrimmed(PLATFORM_FILE),
      suggestedTargets: suggestedTargets(),
      limits: { maxVus: MAX_VUS, maxDurationSeconds: MAX_DURATION_S, maxPoints: MAX_POINTS, maxRate: MAX_RATE },
      scenarios: { wordpress: existsSync(WORDPRESS_SCRIPT) },
      reportAvailable: existsSync(join(REPORT_DIR, "index.html")),
    });
    return;
  }

  if (req.method === "POST" && path === "/api/start") {
    if ((await status()).running) {
      send(res, 409, { errors: ["A run is already in progress. Stop it first."] });
      return;
    }
    const { errors, config } = validate(await readJson(req));
    if (errors.length) {
      send(res, 400, { errors });
      return;
    }
    const result = await start(config);
    if (!result.ok) {
      send(res, 500, { errors: ["Docker refused to start k6.", (result.stderr || result.stdout).trim()] });
      return;
    }
    console.log(JSON.stringify({ panel: "started", ...config }));
    send(res, 200, { started: true, config });
    return;
  }

  if (req.method === "POST" && path === "/api/stop") {
    const result = await stop();
    console.log(JSON.stringify({ panel: "stopped", ok: result.ok }));
    send(res, 200, { stopped: result.ok });
    return;
  }

  send(res, 404, { error: "not found" });
}

createServer((req, res) => {
  route(req, res).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ panel: "request failed", error: message }));
    if (!res.headersSent) send(res, 500, { errors: [message] });
    else res.end();
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(
    `k6 control panel on :${PORT} (dashboard :${DASHBOARD_PORT}, token ${TOKEN ? "required" : "NOT set"}, ` +
      `max ${MAX_VUS} VUs / ${MAX_DURATION_S}s)`,
  );
});
