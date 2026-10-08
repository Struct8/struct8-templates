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
// Reads nothing at runtime: no environment variable, no AWS call.

const MAX_LINES = 10;
const MAX_QTY = 20;

class InvalidOrder extends Error {
  constructor(problems) {
    super(problems.join(' '));
    this.name = 'InvalidOrder';
  }
}

export const handler = async (event) => {
  const order = event?.order ?? {};
  const problems = [];

  const customer = typeof order.customer === 'string' ? order.customer.trim() : '';
  if (!customer) problems.push('The customer name is empty.');

  const items = Array.isArray(order.items) ? order.items : [];
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

  if (problems.length > 0) throw new InvalidOrder(problems);

  const total = Math.round(lines.reduce((sum, line) => sum + line.qty * line.price, 0) * 100) / 100;
  return {
    orderId: event.orderId,
    customer,
    card,
    scenario: typeof order.scenario === 'string' && order.scenario ? order.scenario : 'custom',
    items: lines,
    total,
  };
};
