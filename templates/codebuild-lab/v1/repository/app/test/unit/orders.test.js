import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MAX_QUANTITY, totalCents, validateOrder } from "../../src/orders.js";

const valid = { sku: "BEAN-250G", quantity: 2, unitPriceCents: 1450 };

describe("validateOrder", () => {
  test("accepts a valid order", () => {
    assert.deepEqual(validateOrder(valid), []);
  });

  test("refuses a body that is not an object", () => {
    for (const body of [null, "order", 42, [valid]]) {
      assert.deepEqual(validateOrder(body), ["The body must be a JSON object."]);
    }
  });

  test("refuses a SKU with lowercase letters, spaces or the wrong length", () => {
    for (const sku of ["bean-250g", "BEAN 250G", "AB", "A".repeat(33), 250, undefined]) {
      assert.equal(validateOrder({ ...valid, sku }).length, 1, String(sku));
    }
  });

  test("refuses a quantity outside 1 to the maximum, or not whole", () => {
    for (const quantity of [0, -1, MAX_QUANTITY + 1, 1.5, "2", undefined]) {
      assert.equal(validateOrder({ ...valid, quantity }).length, 1, String(quantity));
    }
    assert.deepEqual(validateOrder({ ...valid, quantity: MAX_QUANTITY }), []);
  });

  test("refuses a price that is not a whole number of cents above zero", () => {
    for (const unitPriceCents of [0, -100, 14.5, "1450", undefined]) {
      assert.equal(validateOrder({ ...valid, unitPriceCents }).length, 1, String(unitPriceCents));
    }
  });

  test("reports every problem at once", () => {
    assert.equal(validateOrder({}).length, 3);
  });
});

describe("totalCents", () => {
  test("multiplies the quantity by the unit price", () => {
    assert.equal(totalCents(valid), 2900);
  });
});
