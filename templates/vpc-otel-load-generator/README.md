# vpc-otel-load-generator

An EC2 OTLP load generator for observability stacks (Grafana LGTM, OpenTelemetry Collector, etc.).
It runs [`telemetrygen`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen),
the official OpenTelemetry generator, to emit **real traces, metrics and logs over OTLP** at a
gateway — so the gateway and its backends actually do work and can be load-tested / watched
autoscaling.

Modeled on `vpc-k6-load-generator`, with the same optional web control panel (Start/Stop,
configure the run, live output). The difference: **k6 generates HTTP load and cannot emit valid
OTLP**, so it exercises an HTTP endpoint, never an OTel gateway. This template is for the OTLP
side.

## How it works

`user_data/otel-loadgen-bootstrap.sh` boots Docker, pulls the multi-arch `telemetrygen` image
(works on x86_64 and arm64/Graviton), and drops a wrapper at `/opt/otelgen/run.sh`. **Nothing runs
on boot** — a run is fired on demand, from the web panel or via Debug Access / SSM.

### Fire a run by hand (Debug Access / SSM)

```
OTLP_ENDPOINT=otel.example.com:443 OTLP_PROTOCOL=http OTLP_INSECURE=false \
  SIGNAL=traces WORKERS=4 RATE=200 DURATION=5m /opt/otelgen/run.sh
```

### Web control panel (optional)

Set `OTEL_PANEL=on` on the instance to serve a browser UI on **port 80**. It is deliberately the
same shape as the `vpc-k6-load-generator` panel, so if you know one you know the other:

- **Constant** mode: endpoint, protocol, TLS, signals, workers, rate, duration — Start/Stop.
- **Curve** mode (carga variável no tempo): a draggable graph of **rate over time** with the same
  presets as k6 (ramp / spike / step / soak) and an editable stage table. telemetrygen has no
  built-in ramp, so the panel runs the curve as back-to-back phases (each segment held at its mean
  rate), which produces the same rising/falling load — enough to watch services scale out and in.

The panel files are fetched from this folder in the public repo at boot (`OTEL_PANEL_REF` pins a
branch/tag/commit, default `main`).

### Three levels of configuration (so an agent can set it up for the user)

1. **Defaults (N1)** — `OTEL_DEF_*` env vars pre-fill the form. The agent sets them on the node;
   the user opens the panel already configured.
2. **Profiles (N2)** — named runs in `profiles.json` (seeded from this folder, or dropped at
   `/opt/otelgen/profiles.json` by the node). The user picks one from a dropdown.
3. **Agent API (N3)** — `GET /api/config` returns defaults + profiles + limits; `POST /api/profile`
   saves a named profile. So an agent can prepare runs without touching the browser.
4. **Live mirror (N3+)** — `POST /api/draft` with a config object sets a shared draft; every open
   panel detects the change on its next poll and **mirrors it into the form automatically** (the
   endpoint, signals, workers, and the whole curve graph). The agent configures, the user's screen
   fills in by itself, and the user just reviews and clicks Start. `GET /api/draft` reads it.
   Example (no-auth lab default): `curl -XPOST .../api/draft -d '{"by":"kiro","config":{...}}'`
   (add `-H "x-panel-token: TOK"` only if `OTEL_PANEL_TOKEN` is set).

## Node environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OTLP_ENDPOINT` | Pre-fills the panel's endpoint field (host:port). | — |
| `OTEL_PANEL` | `on` to serve the web panel on port 80. | off |
| `OTEL_PANEL_REF` | Git ref to fetch the panel files from. | `main` |
| `OTEL_PANEL_TOKEN` | When set, every panel API call needs header `x-panel-token`. | unset (no auth) |
| `OTEL_PANEL_MAX_WORKERS` | Ceiling on workers per run. | 50 |
| `OTEL_PANEL_MAX_DURATION` | Ceiling on run duration, seconds. | 3600 |
| `OTEL_DEF_ENDPOINT` | N1 default: endpoint (falls back to `OTLP_ENDPOINT`). | — |
| `OTEL_DEF_PROTOCOL` | N1 default: `http` or `grpc`. | `http` |
| `OTEL_DEF_INSECURE` | N1 default: `true`/`false`. | `false` |
| `OTEL_DEF_SIGNALS` | N1 default: e.g. `traces,metrics,logs`. | all three |
| `OTEL_DEF_WORKERS` | N1 default: workers. | 4 |
| `OTEL_DEF_RATE` | N1 default: rate per second. | 200 |
| `OTEL_DEF_DURATION` | N1 default: duration (constant mode). | `10m` |
| `OTEL_DEF_MODE` | N1 default: `constant` or `curve`. | `constant` |
| `OTEL_PROFILES_FILE` | Path to the profiles JSON on the instance. | `/opt/otelgen/profiles.json` |

## Security

This is a **lab tool**: by default the panel has **no authentication** (so the user just opens the
URL and uses it — no token to find or share). The panel can fire OTLP load from this instance at
any endpoint, so protect it **at the network layer**: restrict the security group ingress on port
80 to the operator's IP instead of `0.0.0.0/0`. Delete the instance after the test.

If you do need the panel reachable from anywhere, set `OTEL_PANEL_TOKEN` — then every API call
needs the header `x-panel-token`, and the panel shows a token field. Leave it unset for the
no-auth lab default. Keep `OTEL_PANEL_MAX_WORKERS` / `OTEL_PANEL_MAX_DURATION` sane either way.
