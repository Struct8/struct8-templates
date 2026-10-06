// The rules an order follows, kept apart from HTTP and from the database so the
// unit tests can check them without either.

export const MAX_QUANTITY = 100;

const SKU = /^[A-Z0-9-]{3,32}$/;

/**
 * Checks an order as the API receives it.
 *
 * @returns {string[]} The problems found. An empty list means the order is valid.
 */
export function validateOrder(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return ["The body must be a JSON object."];
  }
  const problems = [];
  if (typeof input.sku !== "string" || !SKU.test(input.sku)) {
    problems.push("sku must have 3 to 32 characters: capital letters, digits and hyphens.");
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
    problems.push(`quantity must be a whole number from 1 to ${MAX_QUANTITY}.`);
  }
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 1) {
    problems.push("unitPriceCents must be a whole number of cents, 1 or more.");
  }
  return problems;
}

/** The total of a valid order, in cents. */
export function totalCents(order) {
  return order.quantity * order.unitPriceCents;
}
