// ValidateOrder step of the stepfunctions-order-lab workflow.
//
// Receives the execution input and the execution name, and returns the order
// the rest of the workflow works on:
//   { orderId, customer, card, scenario, items: [{ sku, name, qty, price }], total }
// The execution name is the order id, so every step and every record of this
// order uses the same value.
//
// An order that cannot be processed fails with the error name InvalidOrder,
// which the workflow catches and records as REJECTED. Any other error is a
// defect of this function, and the workflow does not catch it.
//
// Logs one JSON line when it starts and one with the outcome: the problems
// found, or the total. The customer name and the card are not logged.
//
// Reads nothing at runtime: no environment variable, no AWS call.

import { Console } from 'node:console';

const MAX_LINES = 10;
const MAX_QTY = 20;

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

class InvalidOrder extends Error {
  constructor(problems) {
    super(problems.join(' '));
    this.name = 'InvalidOrder';
  }
}

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const order = event?.order ?? {};
  const orderId = event?.orderId;
  const problems = [];

  const items = Array.isArray(order.items) ? order.items : [];
  log('INFO', 'Validating order', { orderId, scenario: order.scenario, lines: items.length });

  const customer = typeof order.customer === 'string' ? order.customer.trim() : '';
  if (!customer) problems.push('The customer name is empty.');

  if (items.length === 0) problems.push('The order has no items.');
  if (items.length > MAX_LINES) problems.push(`The order has ${items.length} lines; the limit is ${MAX_LINES}.`);

  const seen = new Set();
  const lines = [];
  for (const [index, item] of items.entries()) {
    const position = `Line ${index + 1}`;
    const sku = typeof item?.sku === 'string' ? item.sku.trim() : '';
    const qty = Number(item?.qty);
    const price = Number(item?.price);
    if (!sku) {
      problems.push(`${position} has no SKU.`);
      continue;
    }
    // One transaction cannot touch the same stock record twice.
    if (seen.has(sku)) problems.push(`${position} repeats the SKU ${sku}.`);
    seen.add(sku);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      problems.push(`${position} (${sku}) has quantity ${item?.qty}; use a whole number from 1 to ${MAX_QTY}.`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      problems.push(`${position} (${sku}) has price ${item?.price}; use a number above 0.`);
    }
    lines.push({ sku, name: String(item?.name ?? sku), qty, price });
  }

  const card = typeof order.card === 'string' ? order.card.trim() : '';
  if (!/^\d{4}$/.test(card)) problems.push('The card must be the last 4 digits.');

  if (problems.length > 0) {
    log('WARN', 'Order is invalid', { orderId, problems });
    throw new InvalidOrder(problems);
  }

  const total = Math.round(lines.reduce((sum, line) => sum + line.qty * line.price, 0) * 100) / 100;
  log('INFO', 'Order is valid', { orderId, lines: lines.length, units: lines.reduce((sum, line) => sum + line.qty, 0), total });
  return {
    orderId,
    customer,
    card,
    scenario: typeof order.scenario === 'string' && order.scenario ? order.scenario : 'custom',
    items: lines,
    total,
  };
};
