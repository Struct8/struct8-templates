#!/usr/bin/env node
// OTLP load-generator control panel -- a web UI to configure, start and stop telemetrygen runs.
//
// Deliberately modeled on the k6 control panel in this repo so the two feel the same: same layout,
// same Constant/Curve toggle, same draggable SVG curve editor and presets. The vocabulary is the
// OTLP one (endpoint instead of URL, signals instead of HTTP method, workers instead of VUs), and
// the engine is telemetrygen over OTLP instead of k6 over HTTP.
//
// CARGA VARIAVEL NO TEMPO (curve). telemetrygen itself has no ramp -- it runs a fixed rate for a
// fixed duration. So the CURVE is driven here: the panel slices the curve into phases and launches
// a fresh telemetrygen run at each phase's rate, back to back (a scheduler). The visible effect
// (load rising/falling over time, services scaling out then in) is the same as k6's ramping-vus.
//
// THREE LEVELS OF CONFIG (so an agent can set things up for the user):
//   N1 defaults   -- env vars pre-fill the form (OTEL_DEF_*). Agent sets them on the node.
//   N2 profiles   -- /opt/otelgen/profiles.json: named runs the user picks from a dropdown.
//   N3 agent API  -- GET /api/config returns defaults+profiles; POST /api/profile saves one.
//
// SECURITY (same as the k6 panel): OTEL_PANEL_TOKEN gates every /api call; OTEL_PANEL_MAX_WORKERS /
// OTEL_PANEL_MAX_DURATION cap a run. Every value is validated and handed to docker as an argument
// array, never a shell string.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const env = process.env;

const PORT = Number(env.OTEL_PANEL_PORT ?? 80);
const TG_IMAGE = env.TG_IMAGE ?? "ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest";
const PLATFORM_FILE = env.TG_PLATFORM_FILE ?? "/opt/otelgen/platform";
const PROFILES_FILE = env.OTEL_PROFILES_FILE ?? "/opt/otelgen/profiles.json";
const TOKEN = (env.OTEL_PANEL_TOKEN ?? "").trim();
const MAX_WORKERS = positiveInt(env.OTEL_PANEL_MAX_WORKERS, 50);
const MAX_DURATION_S = positiveInt(env.OTEL_PANEL_MAX_DURATION, 3600);
const MAX_POINTS = 50;

const SIGNALS = ["traces", "metrics", "logs"];
const containerFor = (signal) => `otelgen-${signal}`;

function positiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function run(cmd, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

function readTrimmed(path) {
  try { return readFileSync(path, "utf8").trim(); } catch { return ""; }
}

// --- N1: defaults from env ----------------------------------------------------------------------
// The agent sets these on the node; the form opens pre-filled with them.
function defaults() {
  const d = {
    endpoint: String(env.OTEL_DEF_ENDPOINT ?? env.OTLP_ENDPOINT ?? "").trim(),
    protocol: (env.OTEL_DEF_PROTOCOL ?? "http").trim() === "grpc" ? "grpc" : "http",
    insecure: String(env.OTEL_DEF_INSECURE ?? "false").trim() === "true",
    signals: parseSignals(env.OTEL_DEF_SIGNALS) ?? ["traces", "metrics", "logs"],
    workers: positiveInt(env.OTEL_DEF_WORKERS, 4),
    rate: positiveInt(env.OTEL_DEF_RATE, 200),
    duration: (env.OTEL_DEF_DURATION ?? "10m").trim(),
    mode: (env.OTEL_DEF_MODE ?? "constant").trim() === "curve" ? "curve" : "constant",
  };
  return d;
}

function parseSignals(raw) {
  if (!raw) return null;
  const got = String(raw).split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => SIGNALS.includes(s));
  return got.length ? [...new Set(got)] : null;
}

// --- N2: profiles.json --------------------------------------------------------------------------
// A list of named runs. Shape of each: { name, endpoint?, protocol?, insecure?, signals?,
// mode: "constant"|"curve", workers?, rate?, duration?, points?: [{t,vus}] }. endpoint/protocol
// fall back to the env defaults when a profile omits them.
function loadProfiles() {
  try {
    const raw = JSON.parse(readFileSync(PROFILES_FILE, "utf8"));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.profiles) ? raw.profiles : [];
    return list.filter((p) => p && typeof p.name === "string");
  } catch {
    return [];
  }
}

function saveProfiles(list) {
  writeFileSync(PROFILES_FILE, JSON.stringify({ profiles: list }, null, 2));
}

function suggestedEndpoints() {
  const out = [];
  const d = defaults();
  if (d.endpoint) out.push(d.endpoint);
  for (const [k, v] of Object.entries(env)) {
    if (/^AWS_LB_DNSNAME_/.test(k) && v) out.push(`${v}:4318`);
  }
  return [...new Set(out)];
}

// "1h30m10s" -> seconds. NaN when not a valid duration.
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

function validateCommon(input, errors) {
  const endpoint = String(input.endpoint ?? "").trim();
  if (!/^[a-zA-Z0-9.\-]+:\d{1,5}$/.test(endpoint)) {
    errors.push("Endpoint must be host:port, e.g. otel.example.com:443 or alloy:4317 (no http://).");
  }
  const protocol = String(input.protocol ?? "grpc").trim();
  if (protocol !== "grpc" && protocol !== "http") errors.push("Protocol must be grpc or http.");
  const insecure = input.insecure === true || input.insecure === "true";
  const signals = Array.isArray(input.signals) ? input.signals.filter((s) => SIGNALS.includes(s)) : [];
  if (signals.length === 0) errors.push("Pick at least one signal: traces, metrics or logs.");
  const workers = Number(input.workers);
  if (!Number.isInteger(workers) || workers < 1 || workers > MAX_WORKERS) {
    errors.push(`Workers must be a whole number from 1 to ${MAX_WORKERS}.`);
  }
  return { endpoint, protocol, insecure, signals, workers };
}

function validate(input) {
  const errors = [];
  const common = validateCommon(input, errors);

  if (input.mode === "curve") {
    const curve = validateCurve(input.points, errors);
    return { errors, config: { ...common, mode: "curve", ...curve } };
  }

  const rate = Number(input.rate);
  if (!Number.isInteger(rate) || rate < 1 || rate > 100000) errors.push("Rate must be 1 to 100000 (per second).");
  const duration = String(input.duration ?? "").trim();
  const seconds = durationSeconds(duration);
  if (!Number.isFinite(seconds) || seconds < 1) errors.push("Duration must look like 30s, 5m, 1h or 1m30s.");
  else if (seconds > MAX_DURATION_S) errors.push(`Duration is capped at ${MAX_DURATION_S} seconds on this panel.`);

  return { errors, config: { ...common, mode: "constant", rate, duration, totalSeconds: seconds } };
}

// Curve: absolute-time points {t: seconds since start, vus=rate}. We validate the same way the k6
// panel does, then turn the points into PHASES: for each segment we take the segment's average
// rate and hold it for the segment's length. telemetrygen runs that rate for that long, then the
// scheduler starts the next phase. (telemetrygen has no in-run ramp, so a segment is a flat step
// at its mean rate -- close enough to a ramp when segments are short, and exact for flat segments.)
function validateCurve(raw, errors) {
  if (!Array.isArray(raw) || raw.length < 2) {
    errors.push("A curve needs at least two points.");
    return { points: [], phases: [], totalSeconds: 0, peakRate: 0 };
  }
  if (raw.length > MAX_POINTS) errors.push(`A curve is limited to ${MAX_POINTS} points.`);

  const points = raw.map((p) => ({ t: Number(p?.t), vus: Number(p?.vus) }));
  points.forEach((p, i) => {
    if (!Number.isInteger(p.t) || p.t < 0) errors.push(`Point ${i + 1}: time must be a whole number of seconds.`);
    if (!Number.isInteger(p.vus) || p.vus < 0 || p.vus > 100000) errors.push(`Point ${i + 1}: rate must be 0 to 100000.`);
  });
  if (points[0].t !== 0) errors.push("The first point must be at time 0.");
  for (let i = 1; i < points.length; i++) {
    if (points[i].t <= points[i - 1].t) { errors.push(`Point ${i + 1} must come later than point ${i}.`); break; }
  }
  const totalSeconds = points[points.length - 1].t;
  if (totalSeconds > MAX_DURATION_S) errors.push(`The curve is capped at ${MAX_DURATION_S} seconds on this panel.`);
  const peakRate = Math.max(...points.map((p) => p.vus));
  if (peakRate < 1) errors.push("The curve never goes above 0, so nothing would run.");

  // One phase per segment: {rate = mean of the two endpoints, seconds = segment length}.
  const phases = points.slice(1).map((p, i) => ({
    rate: Math.max(1, Math.round((points[i].vus + p.vus) / 2)),
    seconds: p.t - points[i].t,
  }));
  return { points, phases, totalSeconds, peakRate };
}

// --- telemetrygen lifecycle ---------------------------------------------------------------------

async function statusOf(signal) {
  const res = await run("docker", ["inspect", "-f", "{{.State.Running}}|{{.State.ExitCode}}|{{.State.FinishedAt}}", containerFor(signal)]);
  if (!res.ok) return { signal, present: false, running: false, lastRun: null };
  const [running, exitCode, finishedAt] = res.stdout.trim().split("|");
  return { signal, present: true, running: running === "true", lastRun: running === "true" ? null : { exitCode: Number(exitCode), finishedAt } };
}

async function status() {
  const parts = await Promise.all(SIGNALS.map(statusOf));
  return { running: parts.some((p) => p.running) || scheduler.active, signals: parts };
}

async function logs(tail) {
  const chunks = [];
  for (const signal of SIGNALS) {
    const res = await run("docker", ["logs", "--tail", String(tail), containerFor(signal)], 10000);
    const text = `${res.stdout}${res.stderr}`.trim();
    if (text) chunks.push(`===== ${signal} =====\n${text}`);
  }
  return chunks.join("\n\n");
}

function argsFor(signal, cfg, rate, duration) {
  const a = ["run", "-d", "--name", containerFor(signal)];
  const platform = readTrimmed(PLATFORM_FILE);
  if (platform) a.push("--platform", platform);
  a.push(TG_IMAGE, signal, "--otlp-endpoint", cfg.endpoint, "--duration", duration, "--workers", String(cfg.workers));
  if (cfg.insecure) a.push("--otlp-insecure");
  if (cfg.protocol === "http") a.push("--otlp-http");
  if (signal !== "metrics") a.push("--rate", String(rate)); // metrics has no --rate
  a.push("--otlp-attributes", `source="struct8-otel-panel"`);
  return a;
}

async function clearContainers() {
  await Promise.all(SIGNALS.map((s) => run("docker", ["rm", "-f", containerFor(s)])));
}

// Launch one flat run (all selected signals) at a given rate for a given duration.
async function launchPhase(cfg, rate, duration) {
  await clearContainers();
  const results = [];
  for (const signal of cfg.signals) results.push({ signal, ...(await run("docker", argsFor(signal, cfg, rate, duration), 30000)) });
  return results;
}

// --- the scheduler: constant = one phase; curve = a sequence of phases, back to back ------------
const scheduler = { active: false, cfg: null, phases: [], index: 0, timer: null, startedAt: 0 };

function stopScheduler() {
  scheduler.active = false;
  scheduler.phases = [];
  scheduler.index = 0;
  if (scheduler.timer) { clearTimeout(scheduler.timer); scheduler.timer = null; }
}

async function runNextPhase() {
  if (!scheduler.active) return;
  if (scheduler.index >= scheduler.phases.length) { stopScheduler(); await clearContainers(); return; }
  const ph = scheduler.phases[scheduler.index++];
  await launchPhase(scheduler.cfg, ph.rate, `${ph.seconds}s`);
  // Hand off to the next phase slightly before this one ends so there is no idle gap between them.
  const ms = Math.max(1000, ph.seconds * 1000 - 500);
  scheduler.timer = setTimeout(() => { runNextPhase().catch(() => {}); }, ms);
}

async function start(cfg) {
  stopScheduler();
  const phases = cfg.mode === "curve" ? cfg.phases : [{ rate: cfg.rate, seconds: cfg.totalSeconds }];
  if (!phases.length) return [{ ok: false, signal: "-", stderr: "no phases" }];
  scheduler.active = true;
  scheduler.cfg = cfg;
  scheduler.phases = phases;
  scheduler.index = 0;
  scheduler.startedAt = Date.now();
  // Run the first phase synchronously so start errors (bad docker, etc.) surface in the response.
  const first = scheduler.index++;
  const ph = phases[first];
  const results = await launchPhase(cfg, ph.rate, `${ph.seconds}s`);
  if (results.some((r) => !r.ok)) { stopScheduler(); return results; }
  if (phases.length > 1) {
    const ms = Math.max(1000, ph.seconds * 1000 - 500);
    scheduler.timer = setTimeout(() => { runNextPhase().catch(() => {}); }, ms);
  } else {
    // single flat phase: let it finish on its own, then mark inactive after its duration
    scheduler.timer = setTimeout(() => { stopScheduler(); }, ph.seconds * 1000 + 1000);
  }
  return results;
}

async function stopAll() {
  stopScheduler();
  const results = await Promise.all(SIGNALS.map((s) => run("docker", ["stop", containerFor(s)], 30000)));
  return results.every((r) => r.ok);
}

// --- HTTP ---------------------------------------------------------------------------------------

function send(res, status, body, type = "application/json") {
  const text = type === "application/json" ? JSON.stringify(body) : body;
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(text), "cache-control": "no-store" });
  res.end(text);
}

async function readJson(req, limit = 128 * 1024) {
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

function schedulerInfo() {
  if (!scheduler.active) return null;
  return {
    phase: scheduler.index,
    totalPhases: scheduler.phases.length,
    mode: scheduler.cfg?.mode,
    elapsedSeconds: Math.round((Date.now() - scheduler.startedAt) / 1000),
    totalSeconds: scheduler.cfg?.totalSeconds || 0,
  };
}

async function route(req, res) {
  const path = new URL(req.url ?? "/", "http://local").pathname;

  if (req.method === "GET" && (path === "/" || path === "/index.html")) {
    send(res, 200, readFileSync(join(HERE, "index.html"), "utf8"), "text/html; charset=utf-8");
    return;
  }
  if (!path.startsWith("/api/")) { send(res, 404, { error: "not found" }); return; }
  if (!tokenOk(req)) { send(res, 401, { error: "This panel needs its access token." }); return; }

  // N3: everything the agent (or the UI) needs to pre-fill the form.
  if (req.method === "GET" && path === "/api/config") {
    send(res, 200, {
      defaults: defaults(),
      profiles: loadProfiles(),
      suggestedEndpoints: suggestedEndpoints(),
      limits: { maxWorkers: MAX_WORKERS, maxDurationSeconds: MAX_DURATION_S, maxPoints: MAX_POINTS, signals: SIGNALS },
    });
    return;
  }

  // N3: save/replace a named profile so the agent can set runs up for the user.
  if (req.method === "POST" && path === "/api/profile") {
    const body = await readJson(req);
    const { errors } = validate(body); // reuse run validation
    if (!body.name || typeof body.name !== "string") errors.unshift("A profile needs a name.");
    if (errors.length) { send(res, 400, { errors }); return; }
    const list = loadProfiles().filter((p) => p.name !== body.name);
    list.push(body);
    try { saveProfiles(list); } catch (e) { send(res, 500, { errors: ["Could not write profiles.json: " + e.message] }); return; }
    send(res, 200, { saved: true, profiles: list });
    return;
  }

  if (req.method === "GET" && path === "/api/status") {
    const s = await status();
    const logText = await logs(300);
    send(res, 200, {
      ...s,
      scheduler: schedulerInfo(),
      logs: logText.length > 20000 ? logText.slice(-20000) : logText,
    });
    return;
  }

  if (req.method === "POST" && path === "/api/start") {
    if ((await status()).running) { send(res, 409, { errors: ["A run is already in progress. Stop it first."] }); return; }
    const { errors, config } = validate(await readJson(req));
    if (errors.length) { send(res, 400, { errors }); return; }
    const results = await start(config);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      send(res, 500, { errors: ["Docker refused to start telemetrygen.", ...failed.map((f) => `${f.signal}: ${(f.stderr || f.stdout).trim()}`)] });
      return;
    }
    console.log(JSON.stringify({ panel: "started", mode: config.mode, endpoint: config.endpoint, signals: config.signals }));
    send(res, 200, { started: true, config });
    return;
  }

  if (req.method === "POST" && path === "/api/stop") {
    const ok = await stopAll();
    console.log(JSON.stringify({ panel: "stopped", ok }));
    send(res, 200, { stopped: ok });
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
  console.log(`OTLP load-generator panel on :${PORT} (token ${TOKEN ? "required" : "NOT set"}, max ${MAX_WORKERS} workers / ${MAX_DURATION_S}s)`);
});
