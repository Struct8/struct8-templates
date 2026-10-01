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
// SECURITY
// This template is a short-lived teaching lab, so the panel is meant to be reachable from anywhere
// (port 80 open to 0.0.0.0/0). Whoever reaches it can fire load FROM this instance at any URL. Two
// guards bound that:
//   * K6_PANEL_TOKEN -- when set, every /api call must carry it (header x-panel-token). Unset means
//     no authentication at all.
//   * K6_PANEL_MAX_VUS / K6_PANEL_MAX_DURATION -- ceilings on what a single run may ask for.
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
const REPORT_DIR = env.K6_REPORT_DIR ?? "/opt/k6/report";
const PLATFORM_FILE = env.K6_PLATFORM_FILE ?? "/opt/k6/platform";
const DASHBOARD_PORT = Number(env.DASHBOARD_PORT ?? 5665);
const TOKEN = (env.K6_PANEL_TOKEN ?? "").trim();
const MAX_VUS = positiveInt(env.K6_PANEL_MAX_VUS, 500);
const MAX_DURATION_S = positiveInt(env.K6_PANEL_MAX_DURATION, 3600);

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

// The generator writes one variable per wire leaving this instance, e.g. AWS_LB_DNSNAME_0 for a
// wired load balancer. Those are offered in the form as ready-made targets.
function suggestedTargets() {
  return Object.entries(env)
    .filter(([k, v]) => /^AWS_LB_DNSNAME_/.test(k) && v)
    .map(([, v]) => `http://${v}/`);
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

  const vus = Number(input.vus);
  if (!Number.isInteger(vus) || vus < 1 || vus > MAX_VUS) errors.push(`VUs must be a whole number from 1 to ${MAX_VUS}.`);

  const duration = String(input.duration ?? "").trim();
  const seconds = durationSeconds(duration);
  if (!Number.isFinite(seconds) || seconds < 1) errors.push("Duration must look like 30s, 5m, 1h or 1m30s.");
  else if (seconds > MAX_DURATION_S) errors.push(`Duration is capped at ${MAX_DURATION_S} seconds on this panel.`);

  const rpsText = String(input.rps ?? "").trim();
  const rps = rpsText === "" ? 0 : Number(rpsText);
  if (rpsText !== "" && (!Number.isInteger(rps) || rps < 1 || rps > 100000)) errors.push("Rate, when set, must be a whole number from 1 to 100000.");

  const method = String(input.method ?? "GET").trim().toUpperCase();
  if (!METHODS.has(method)) errors.push(`Method must be one of ${[...METHODS].join(", ")}.`);

  const body = String(input.body ?? "");
  if (body.length > 10000) errors.push("Body is limited to 10000 characters.");

  return { errors, config: { targetUrl, vus, duration, rps, method, body } };
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
  args.push(
    "-p", `${DASHBOARD_PORT}:${DASHBOARD_PORT}`,
    "-e", `TARGET_URL=${cfg.targetUrl}`,
    "-e", `VUS=${cfg.vus}`,
    "-e", `DURATION=${cfg.duration}`,
    "-e", `METHOD=${cfg.method}`,
  );
  if (cfg.rps > 0) args.push("-e", `RPS=${cfg.rps}`);
  if (cfg.body) args.push("-e", `BODY=${cfg.body}`);
  args.push(
    "-e", "K6_WEB_DASHBOARD=true",
    "-e", "K6_WEB_DASHBOARD_HOST=0.0.0.0",
    "-e", `K6_WEB_DASHBOARD_PORT=${DASHBOARD_PORT}`,
    "-e", "K6_WEB_DASHBOARD_EXPORT=/report/index.html",
    "-v", `${REPORT_DIR}:/report`,
    "-v", `${dirname(SCRIPT_PATH)}:/scripts:ro`,
    // K6_WEB_DASHBOARD=true is what turns the dashboard on. Adding `--out web-dashboard` as well
    // starts a second one on the same port, which fails with "address already in use".
    K6_IMAGE, "run", `/scripts/${basename(SCRIPT_PATH)}`,
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
    send(res, 200, {
      ...s,
      logs: s.running || s.lastRun ? await logs(150) : "",
      dashboardPort: DASHBOARD_PORT,
      platform: readTrimmed(PLATFORM_FILE),
      suggestedTargets: suggestedTargets(),
      limits: { maxVus: MAX_VUS, maxDurationSeconds: MAX_DURATION_S },
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
