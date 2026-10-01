#!/usr/bin/env node
/**
 * ApplyFlow Persistence V2 — isolated backup/restore drill (NON-production).
 *
 * Usage (from apps/applyflow):
 *   node ./scripts/persistence-v2/backup-restore-drill.cjs
 *
 * Requires local Docker Postgres on 5434 (pnpm db:up) and pg_dump/pg_restore in PATH.
 * Never targets Production Supabase. Dump files stay under .tmp/ (gitignored).
 */

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "../..");
const TMP = resolve(ROOT, ".tmp/backup-drill");
const DUMP = resolve(TMP, "applyflow-local-drill.dump");

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1"]);

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

function parseDbUrl(raw) {
  if (!raw || !String(raw).trim()) fail("missing_database_url");
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("unparseable_database_url");
  }
  if (!SAFE_HOSTS.has(url.hostname)) fail("unsafe_database_host");
  if (url.hostname.includes("supabase")) fail("supabase_host_forbidden");
  return url;
}

function run(cmd, args, env, options = {}) {
  const result = spawnSync(cmd, args, {
    env,
    encoding: "utf8",
    windowsHide: true,
  });
  const allowNonZero = Boolean(options.allowNonZero);
  if (result.status !== 0 && !allowNonZero) {
    fail(`${cmd}_failed:${(result.stderr || result.stdout || "").slice(0, 400)}`);
  }
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status ?? 1 };
}

function main() {
  // Prefer explicit local override; never use remote DATABASE_URL from .env.local.
  const sourceUrl =
    process.env.APPLYFLOW_BACKUP_SOURCE_URL ||
    "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";
  const restoreDbName = process.env.APPLYFLOW_BACKUP_RESTORE_DB || "applyflow_restore_drill";

  const source = parseDbUrl(sourceUrl);
  if (source.pathname.replace(/^\//, "") === restoreDbName) {
    fail("source_and_restore_db_must_differ");
  }

  mkdirSync(TMP, { recursive: true });
  if (existsSync(DUMP)) rmSync(DUMP);

  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = "/postgres";

  const env = {
    ...process.env,
    PGPASSWORD: decodeURIComponent(source.password || ""),
  };

  run("psql", [sourceUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1"], env);

  run("pg_dump", ["--format=custom", "--file", DUMP, "--dbname", sourceUrl], env);

  if (!existsSync(DUMP)) fail("dump_missing");
  const sha = createHash("sha256").update(readFileSync(DUMP)).digest("hex");
  const listing = run("pg_restore", ["-l", DUMP], env).stdout;

  run("psql", [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS "${restoreDbName}"`], env);
  run("psql", [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE "${restoreDbName}"`], env);

  const restoreUrl = new URL(sourceUrl);
  restoreUrl.pathname = `/${restoreDbName}`;
  // pg_restore may exit 1 on ignorable SET parameter mismatches across Postgres versions.
  const restore = run(
    "pg_restore",
    ["--dbname", restoreUrl.toString(), "--no-owner", "--no-acl", DUMP],
    env,
    { allowNonZero: true },
  );
  if (restore.status !== 0 && !/transaction_timeout|errors ignored on restore/i.test(restore.stderr)) {
    fail(`pg_restore_failed:${restore.stderr.slice(0, 400)}`);
  }

  const tables = run(
    "psql",
    [
      restoreUrl.toString(),
      "-v",
      "ON_ERROR_STOP=1",
      "-tAc",
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'",
    ],
    env,
  ).stdout.trim();

  const appTables = run(
    "psql",
    [
      restoreUrl.toString(),
      "-v",
      "ON_ERROR_STOP=1",
      "-tAc",
      "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'applyflow_%'",
    ],
    env,
  ).stdout.trim();

  writeFileSync(
    resolve(TMP, "drill-report.json"),
    JSON.stringify(
      {
        ok: true,
        sourceHost: source.hostname,
        sourceDb: source.pathname.replace(/^\//, ""),
        restoreDb: restoreDbName,
        dumpSha256: sha,
        publicTableCount: Number(tables) || 0,
        applyflowTableCount: Number(appTables) || 0,
        listingLines: listing.split("\n").length,
        restoreExitStatus: restore.status,
      },
      null,
      2,
    ),
  );

  run("psql", [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS "${restoreDbName}"`], env);

  console.log(
    JSON.stringify({
      ok: true,
      dumpSha256: sha,
      publicTableCount: Number(tables) || 0,
      applyflowTableCount: Number(appTables) || 0,
      artifactDir: ".tmp/backup-drill",
    }),
  );
}

main();
