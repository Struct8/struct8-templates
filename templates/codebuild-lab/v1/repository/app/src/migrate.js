// Applies the SQL files of migrations/ that the database has not seen yet, in
// file name order, each one in its own transaction. The names already applied
// are kept in schema_migrations, so a second run applies nothing.
//
// The release and the nightly run can start an integration build at the same
// time. The advisory lock makes the second one wait for the first instead of
// applying the same file twice.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPool } from "./db.js";

const MIGRATIONS = fileURLToPath(new URL("../migrations/", import.meta.url));
const LOCK_ID = 727071;

export async function migrate(pool) {
  const client = await pool.connect();
  const applied = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
    );
    const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      const seen = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (seen.rowCount > 0) continue;
      await client.query("BEGIN");
      try {
        await client.query(await readFile(join(MIGRATIONS, name), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${error.message}`, { cause: error });
      }
      applied.push(name);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
  return applied;
}

// `npm run migrate`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createPool();
  try {
    const applied = await migrate(pool);
    console.log(applied.length > 0 ? `Applied: ${applied.join(", ")}` : "Nothing to apply.");
  } finally {
    await pool.end();
  }
}
