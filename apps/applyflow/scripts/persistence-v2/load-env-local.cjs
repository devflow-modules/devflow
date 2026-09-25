/**
 * Load apps/applyflow/.env.local into process.env (override).
 * Used by local db:* npm scripts so Prisma never inherits Production shell env.
 */
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const path = resolve(__dirname, "../../.env.local");
if (!existsSync(path)) {
  console.error("Missing apps/applyflow/.env.local — create it for local Docker (see .env.example).");
  process.exit(2);
}
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}
