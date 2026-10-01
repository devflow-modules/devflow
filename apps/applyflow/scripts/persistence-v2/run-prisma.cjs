/**
 * Run Prisma CLI with apps/applyflow/.env.local loaded (override).
 * Usage:
 *   node scripts/persistence-v2/run-prisma.cjs migrate deploy
 *   node scripts/persistence-v2/run-prisma.cjs --force-local migrate deploy
 *
 * Mutating commands refuse non-local DATABASE_URL hosts (fail-closed).
 * `--force-local` / APPLYFLOW_PRISMA_FORCE_LOCAL_DOCKER=1 pins Docker 127.0.0.1:5434.
 * Never prints connection strings.
 */
require("./load-env-local.cjs");
const { spawnSync } = require("node:child_process");

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_DOCKER_URL =
  "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";

function hostnameOf(raw) {
  if (!raw || !String(raw).trim()) return "missing";
  try {
    return new URL(raw).hostname;
  } catch {
    return "unparseable";
  }
}

function isMutatingPrismaCommand(args) {
  const joined = args.join(" ").toLowerCase();
  return (
    joined.includes("migrate deploy") ||
    joined.includes("migrate reset") ||
    joined.includes("migrate dev") ||
    joined.includes("db push") ||
    joined.includes("db execute") ||
    joined.includes("db seed")
  );
}

function assertLocalDbForMutatingCommands(args) {
  if (!isMutatingPrismaCommand(args)) return;

  const host = hostnameOf(process.env.DATABASE_URL);
  if (!SAFE_HOSTS.has(host)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "prisma_mutating_command_refused_non_local_database",
        hostKind:
          host.includes("supabase") || host.includes("pooler")
            ? "remote_pooler_or_supabase"
            : "remote_or_unparseable",
        hint: "Use pnpm db:migrate (force-local) against Docker 127.0.0.1:5434. Refusing to continue.",
      }),
    );
    process.exit(1);
  }
}

let args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/persistence-v2/run-prisma.cjs [--force-local] <prisma args...>");
  process.exit(2);
}

const forceLocal =
  args.includes("--force-local") || process.env.APPLYFLOW_PRISMA_FORCE_LOCAL_DOCKER === "1";
args = args.filter((arg) => arg !== "--force-local");

if (forceLocal) {
  process.env.DATABASE_URL = LOCAL_DOCKER_URL;
  process.env.DIRECT_URL = LOCAL_DOCKER_URL;
  process.env.APPLYFLOW_DB_TARGET = "local";
}

assertLocalDbForMutatingCommands(args);

const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: require("node:path").resolve(__dirname, "../.."),
});

process.exit(result.status === null ? 1 : result.status);
