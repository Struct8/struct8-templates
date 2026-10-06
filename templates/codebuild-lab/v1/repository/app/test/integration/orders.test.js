// The API against a real PostgreSQL database, reached through the PG* variables
// (see src/db.js). Runs in the integration project, inside the VPC, after
// `npm run migrate`; the migration runs here too, and applies nothing the second
// time.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../../src/db.js";
import { migrate } from "../../src/migrate.js";
import { createServer } from "../../src/server.js";

let pool;
let server;
let base;

before(async () => {
  pool = createPool();
  await migrate(pool);
  server = createServer(pool);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

/** A SKU no other run has used, so the tests can count their own rows. */
function freshSku() {
  return `IT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6)}`;
}

async function countOrders(sku) {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM orders WHERE sku = $1", [sku]);
  return rows[0].n;
}

describe("orders API on PostgreSQL", () => {
  test("health answers once the database does", async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });

  test("the migrations are applied, and a second run applies nothing", async () => {
    assert.deepEqual(await migrate(pool), []);
    const { rows } = await pool.query("SELECT name FROM schema_migrations ORDER BY name");
    assert.ok(rows.some((row) => row.name === "001_create_orders.sql"));
  });

  test("an order is stored and read back with its total", async () => {
    const sku = freshSku();
    const created = await fetch(`${base}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku, quantity: 3, unitPriceCents: 1250 }),
    });
    assert.equal(created.status, 201);
    const order = await created.json();
    assert.equal(order.totalCents, 3750);

    const read = await fetch(`${base}/orders/${order.id}`);
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), order);
    assert.equal(await countOrders(sku), 1);
  });

  test("an invalid order is refused, and nothing is stored", async () => {
    const sku = freshSku();
    const res = await fetch(`${base}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku, quantity: 0, unitPriceCents: 1250 }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).problems.length, 1);
    assert.equal(await countOrders(sku), 0);
  });

  test("an order that does not exist is 404", async () => {
    const res = await fetch(`${base}/orders/999999999`);
    assert.equal(res.status, 404);
  });
});
