// The connection pool.
//
// node-postgres reads the standard PostgreSQL variables -- PGHOST, PGPORT,
// PGUSER, PGPASSWORD, PGDATABASE and PGSSLMODE -- and that is the whole
// configuration. buildspec/integration.yml sets them from the database the
// CodeBuild project is connected to.
import pg from "pg";

export function createPool() {
  return new pg.Pool({ max: 5 });
}
