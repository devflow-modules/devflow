/**
 * Orchestrates local PostgreSQL evidence: migrate deploy + migration checks + vitest PG suite.
 * Requires Docker Postgres on localhost (default port 5433) or WHATSAPP_DATABASE_URL already set.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "../..");

const DEFAULT_PORT = process.env.WHATSAPP_PG_EVIDENCE_PORT?.trim() || "5435";
const DEFAULT_URL = `postgresql://whatsapp_evidence:whatsapp_evidence@127.0.0.1:${DEFAULT_PORT}/whatsapp_evidence`;

function run(cmd: string, args: string[], extraEnv: Record<string, string>): number {
  const r = spawnSync(cmd, args, {
    cwd: appRoot,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

function ensureDockerPostgres(): void {
  if (process.env.WHATSAPP_SKIP_DOCKER === "1") return;
  const inspect = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", "wa-pg-evidence"], {
    encoding: "utf8",
  });
  if (inspect.stdout?.trim() === "true") return;
  spawnSync("docker", ["rm", "-f", "wa-pg-evidence"], { stdio: "ignore" });
  const up = spawnSync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      "wa-pg-evidence",
      "-e",
      "POSTGRES_USER=whatsapp_evidence",
      "-e",
      "POSTGRES_PASSWORD=whatsapp_evidence",
      "-e",
      "POSTGRES_DB=whatsapp_evidence",
      "-p",
      `${DEFAULT_PORT}:5432`,
      "postgres:16",
    ],
    { stdio: "inherit" }
  );
  if (up.status !== 0) {
    console.error("Failed to start wa-pg-evidence container");
    process.exit(1);
  }
  spawnSync("docker", ["exec", "wa-pg-evidence", "pg_isready", "-U", "whatsapp_evidence"], {
    stdio: "inherit",
  });
}

const url = process.env.WHATSAPP_DATABASE_URL?.trim() || DEFAULT_URL;
ensureDockerPostgres();

const env = {
  WHATSAPP_DATABASE_URL: url,
  WHATSAPP_DIRECT_URL: process.env.WHATSAPP_DIRECT_URL?.trim() || url,
  WHATSAPP_PG_INTEGRATION: "1",
  WHATSAPP_PG_UPGRADE_DATABASE: process.env.WHATSAPP_PG_UPGRADE_DATABASE || "whatsapp_pg_upgrade_sim",
};

let code = run("npx", ["prisma", "migrate", "deploy"], env);
if (code !== 0) process.exit(code);

code = run("npx", ["tsx", "scripts/test/pg-migration-evidence.ts"], env);
if (code !== 0) process.exit(code);

code = run(
  "npx",
  ["vitest", "run", "--project", "node", "src/modules/inbox/__tests__/pgEvidence.realpostgres.test.ts"],
  env
);
process.exit(code);
