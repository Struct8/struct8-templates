// PackItem step of the stepfunctions-order-lab workflow, run once per item by
// the Map state, with at most 3 running at the same time.
//
// Receives { orderId, item: { sku, name, qty, price } } and returns
//   { sku, qty, box, startedAt, packedAt, worker }
// It waits 1.5 to 3 seconds to stand for the packing, so the overlapping
// startedAt/packedAt times of an order with several items show the Map running
// items in parallel. worker is the start of the Lambda request id: items packed
// at the same time run in different instances of the function.
//
// Logs the start and the end of each item, with the box and how long it took.
//
// Reads nothing at runtime: no environment variable, no AWS call.

import { Console } from 'node:console';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- Logs
// One JSON object per line, written straight to stdout. The runtime's console
// puts the time, the request id and the level in front of each line, which
// makes it text; a line that is JSON from its first character is split into
// fields by CloudWatch Logs Insights, so a query can filter on orderId or
// level with no parse step. traceId is the X-Ray trace of the invocation, the
// id the X-Ray console searches by.
const out = new Console({ stdout: process.stdout, stderr: process.stderr });
let requestId;

function log(level, message, fields = {}) {
  const traceId = /Root=([^;]+)/.exec(process.env._X_AMZN_TRACE_ID ?? '')?.[1];
  out.log(JSON.stringify({ level, message, ...fields, requestId, traceId }));
}

function boxFor(qty) {
  if (qty <= 1) return 'small';
  if (qty <= 3) return 'medium';
  return 'large';
}

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const item = event?.item ?? {};
  const box = boxFor(Number(item.qty) || 1);
  const fields = { orderId: event?.orderId, sku: item.sku, qty: item.qty, box };
  log('INFO', 'Packing item', fields);

  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  await sleep(1500 + Math.floor(Math.random() * 1500));

  log('INFO', 'Item packed', { ...fields, durationMs: Date.now() - started });
  return {
    sku: item.sku,
    qty: item.qty,
    box,
    startedAt,
    packedAt: new Date().toISOString(),
    worker: String(context?.awsRequestId ?? '').slice(0, 8),
  };
};
