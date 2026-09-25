/**
 * Run Prisma CLI with apps/applyflow/.env.local loaded (override).
 * Usage: node scripts/persistence-v2/run-prisma.cjs migrate deploy
 */
require("./load-env-local.cjs");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/persistence-v2/run-prisma.cjs <prisma args...>");
  process.exit(2);
}

const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: require("node:path").resolve(__dirname, "../.."),
});

process.exit(result.status === null ? 1 : result.status);
