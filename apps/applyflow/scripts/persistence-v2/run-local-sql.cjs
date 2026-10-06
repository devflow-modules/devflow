/**
 * Run local-only SQL against ApplyFlow Docker Postgres.
 * Usage:
 *   node scripts/persistence-v2/run-local-sql.cjs inspect-runtime-role.sql
 *   node scripts/persistence-v2/run-local-sql.cjs rehearse-runtime-role.sql
 *
 * Refuses non-local hosts. Never prints connection strings or passwords.
 */
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { existsSync } = require("node:fs");

const LOCAL_URL = "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";
const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/persistence-v2/run-local-sql.cjs <sql-file>");
  process.exit(2);
}
const sqlPath = resolve(__dirname, "sql", fileArg);
if (!existsSync(sqlPath)) {
  console.error(JSON.stringify({ ok: false, error: "sql_file_missing", file: fileArg }));
  process.exit(2);
}

process.env.DATABASE_URL = LOCAL_URL;
process.env.PGPASSWORD = "applyflow_local_dev";

const result = spawnSync(
  "psql",
  ["-h", "127.0.0.1", "-p", "5434", "-U", "applyflow", "-d", "applyflow", "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
  { encoding: "utf8", env: process.env },
);

if (result.error) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "psql_unavailable",
      detail: result.error.message,
      hint: "Install PostgreSQL client tools or run the SQL via Docker exec.",
    }),
  );
  process.exit(1);
}

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status === 0 ? 0 : result.status || 1);
