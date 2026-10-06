// The orders API, on node:http with no framework:
//
//   GET  /health        200 once the database answers
//   POST /orders        checks, stores and returns the order (201)
//   GET  /orders/<id>   the stored order, or 404
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createPool } from "./db.js";
import { totalCents, validateOrder } from "./orders.js";

const MAX_BODY_BYTES = 16 * 1024;

export function createServer(pool) {
  return createHttpServer(async (req, res) => {
    try {
      await route(pool, req, res);
    } catch (error) {
      console.error(error);
      send(res, 500, { error: "Internal error." });
    }
  });
}

async function route(pool, req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && pathname === "/health") {
    await pool.query("SELECT 1");
    return send(res, 200, { status: "ok" });
  }

  if (req.method === "POST" && pathname === "/orders") {
    const body = await readJson(req);
    if (body === undefined) return send(res, 400, { error: "The body is not valid JSON." });
    const problems = validateOrder(body);
    if (problems.length > 0) return send(res, 400, { error: "Invalid order.", problems });
    const { rows } = await pool.query(
      `INSERT INTO orders (sku, quantity, unit_price_cents, total_cents)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sku, quantity, unit_price_cents, total_cents, created_at`,
      [body.sku, body.quantity, body.unitPriceCents, totalCents(body)]
    );
    return send(res, 201, toOrder(rows[0]));
  }

  const id = /^\/orders\/(\d{1,9})$/.exec(pathname)?.[1];
  if (req.method === "GET" && id !== undefined) {
    const { rows } = await pool.query(
      "SELECT id, sku, quantity, unit_price_cents, total_cents, created_at FROM orders WHERE id = $1",
      [Number(id)]
    );
    if (rows.length === 0) return send(res, 404, { error: "No order with this id." });
    return send(res, 200, toOrder(rows[0]));
  }

  return send(res, 404, { error: "Not found." });
}

function toOrder(row) {
  return {
    id: row.id,
    sku: row.sku,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalCents: row.total_cents,
    createdAt: row.created_at,
  };
}

/** The parsed body, or undefined when it is not JSON or is too large. */
async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return undefined;
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

// `npm start`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createPool();
  const server = createServer(pool);
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => console.log(`Listening on port ${port}`));
  process.on("SIGTERM", () => server.close(() => pool.end()));
}
