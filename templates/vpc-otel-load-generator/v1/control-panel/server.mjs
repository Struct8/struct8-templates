#!/usr/bin/env node
// OTLP load-generator control panel -- a small web UI to configure, start and stop telemetrygen runs.
//
// WHY THIS EXISTS
// telemetrygen is a CLI with no UI. This panel is the missing half: a form for the OTLP endpoint,
// which signals to send (traces / metrics / logs), workers, rate and duration, Start/Stop buttons,
// and the live output. Modeled on the k6 control panel in this repo (same shape, same guards), but
// it drives telemetrygen over OTLP instead of k6 over HTTP.
//
// HOW IT DRIVES telemetrygen
// Start -> one `docker run -d --name otelgen-<signal> ... telemetrygen <signal> ...` per selected
// signal, so traces+metrics+logs can run at once and hit the whole LGTM pipeline together.
// Stop -> `docker stop` on each. Status -> `docker inspect` on them. Containers are kept after they
// stop (no --rm) so the last run's output stays readable.
//
// SECURITY (same model as the k6 panel)
//   * OTEL_PANEL_TOKEN -- when set, every /api call must carry it (header x-panel-token).
//   * OTEL_PANEL_MAX_WORKERS / OTEL_PANEL_MAX_DURATION -- ceilings on a single run.
// Every value is validated and handed to docker as an argument array, never a shell string.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const env = process.env;

const PORT = Number(env.OTEL_PANEL_PORT ?? 80);
const TG_IMAGE = env.TG_IMAGE ?? "ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest";
const PLATFORM_FILE = env.TG_PLATFORM_FILE ?? "/opt/otelgen/platform";
const TOKEN = (env.OTEL_PANEL_TOKEN ?? "").trim();
const MAX_WORKERS = positiveInt(env.OTEL_PANEL_MAX_WORKERS, 50);
const MAX_DURATION_S = positiveInt(env.OTEL_PANEL_MAX_DURATION, 3600);

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

// Endpoint suggestions, best first. OTLP_ENDPOINT on the node pre-fills the field (often a
// Terraform interpolation, e.g. "otel.cloudman.pro:443"); AWS_LB_DNSNAME_* wires become host:4318.
function suggestedEndpoints() {
  const out = [];
  const ep = String(env.OTLP_ENDPOINT ?? "").trim();
  if (ep) out.push(ep);
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

// --- validation (messages are shown to the person) ---------------------------------------------

function validate(input) {
  const errors = [];

  const endpoint = String(input.endpoint ?? "").trim();
  // host:port, no scheme (telemetrygen wants host:port, not a URL).
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

  const rate = Number(input.rate);
  if (!Number.isInteger(rate) || rate < 1 || rate > 100000) {
    errors.push("Rate must be a whole number from 1 to 100000 (per second, per worker).");
  }

  const duration = String(input.duration ?? "").trim();
  const seconds = durationSeconds(duration);
  if (!Number.isFinite(seconds) || seconds < 1) errors.push("Duration must look like 30s, 5m, 1h or 1m30s.");
  else if (seconds > MAX_DURATION_S) errors.push(`Duration is capped at ${MAX_DURATION_S} seconds on this panel.`);

  return { errors, config: { endpoint, protocol, insecure, signals, workers, rate, duration } };
}

// --- telemetrygen lifecycle ---------------------------------------------------------------------

async function statusOf(signal) {
  const res = await run("docker", ["inspect", "-f", "{{.State.Running}}|{{.State.ExitCode}}|{{.State.FinishedAt}}", containerFor(signal)]);
  if (!res.ok) return { signal, present: false, running: false, lastRun: null };
  const [running, exitCode, finishedAt] = res.stdout.trim().split("|");
  return {
    signal,
    present: true,
    running: running === "true",
    lastRun: running === "true" ? null : { exitCode: Number(exitCode), finishedAt },
  };
}

async function status() {
  const parts = await Promise.all(SIGNALS.map(statusOf));
  return { running: parts.some((p) => p.running), signals: parts };
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

function argsFor(signal, cfg) {
  const a = ["run", "-d", "--name", containerFor(signal)];
  const platform = readTrimmed(PLATFORM_FILE);
  if (platform) a.push("--platform", platform);
  a.push(TG_IMAGE, signal, "--otlp-endpoint", cfg.endpoint, "--duration", cfg.duration, "--workers", String(cfg.workers));
  if (cfg.insecure) a.push("--otlp-insecure");
  if (cfg.protocol === "http") a.push("--otlp-http");
  if (signal !== "metrics") a.push("--rate", String(cfg.rate)); // metrics has no --rate
  a.push("--otlp-attributes", `source="struct8-otel-panel"`);
  return a;
}

async function start(cfg) {
  // Clear any stopped containers holding the names.
  await Promise.all(SIGNALS.map((s) => run("docker", ["rm", "-f", containerFor(s)])));
  const results = [];
  for (const signal of cfg.signals) {
    results.push({ signal, ...(await run("docker", argsFor(signal, cfg), 30000)) });
  }
  return results;
}

async function stopAll() {
  const results = await Promise.all(SIGNALS.map((s) => run("docker", ["stop", containerFor(s)], 30000)));
  return results.every((r) => r.ok);
}

// --- HTTP ---------------------------------------------------------------------------------------

function send(res, status, body, type = "application/json") {
  const text = type === "application/json" ? JSON.stringify(body) : body;
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(text), "cache-control": "no-store" });
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
  if (!path.startsWith("/api/")) { send(res, 404, { error: "not found" }); return; }
  if (!tokenOk(req)) { send(res, 401, { error: "This panel needs its access token." }); return; }

  if (req.method === "GET" && path === "/api/status") {
    const s = await status();
    const logText = await logs(300);
    send(res, 200, {
      ...s,
      logs: logText.length > 20000 ? logText.slice(-20000) : logText,
      suggestedEndpoints: suggestedEndpoints(),
      limits: { maxWorkers: MAX_WORKERS, maxDurationSeconds: MAX_DURATION_S, signals: SIGNALS },
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
    console.log(JSON.stringify({ panel: "started", ...config }));
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
