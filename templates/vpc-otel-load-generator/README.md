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

Set `OTEL_PANEL=on` on the instance to serve a browser UI on **port 80**: pick the endpoint,
protocol, signals (traces/metrics/logs, each its own container in parallel), workers, rate and
duration, with Start/Stop and live output. The panel files are fetched from this folder in the
public repo at boot (`OTEL_PANEL_REF` pins a branch/tag/commit, default `main`).

## Node environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OTLP_ENDPOINT` | Pre-fills the panel's endpoint field (host:port). | — |
| `OTEL_PANEL` | `on` to serve the web panel on port 80. | off |
| `OTEL_PANEL_REF` | Git ref to fetch the panel files from. | `main` |
| `OTEL_PANEL_TOKEN` | When set, every panel API call needs header `x-panel-token`. | unset (no auth) |
| `OTEL_PANEL_MAX_WORKERS` | Ceiling on workers per run. | 50 |
| `OTEL_PANEL_MAX_DURATION` | Ceiling on run duration, seconds. | 3600 |

## Security

The panel can fire OTLP load **from this instance at any endpoint**. On a public subnet with port
80 open to the world, set `OTEL_PANEL_TOKEN` (and keep the ceilings sane) or restrict the security
group ingress to your IP. This is a short-lived lab tool — delete the instance after the test.
