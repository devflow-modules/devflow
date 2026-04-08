#!/usr/bin/env node
/**
 * Load .env.local from monorepo root, then run next dev.
 * Use: pnpm dev
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env.local");
const appEnv = path.resolve(__dirname, "../.env.local");
const rootResult = config({ path: rootEnv });
const appResult = config({ path: appEnv });
const env = {
  ...process.env,
  ...(rootResult?.parsed ?? {}),
  ...(appResult?.parsed ?? {}),
};

// Fallback JWT_SECRET em dev (não em produção)
if (!env.JWT_SECRET && env.NODE_ENV !== "production") {
  env.JWT_SECRET = "devflow-whatsapp-platform-dev-secret-minimum-32-chars";
  console.warn("[dev] JWT_SECRET ausente — usando fallback local. Configure JWT_SECRET em .env.local para testes realistas.");
}

// Pooler Supabase sem pgbouncer=true → Postgres 42P05 com Prisma (alinhado a src/lib/prisma.ts)
const dbUrl = env.WHATSAPP_DATABASE_URL;
if (
  dbUrl &&
  !dbUrl.includes("pgbouncer=true") &&
  (dbUrl.includes("pooler") || (dbUrl.includes("supabase.co") && dbUrl.includes(":6543")))
) {
  env.WHATSAPP_DATABASE_URL = dbUrl.includes("?") ? `${dbUrl}&pgbouncer=true` : `${dbUrl}?pgbouncer=true`;
}

const next = spawn("pnpm", ["exec", "next", "dev", "--port", "3000"], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
  env,
});
next.on("close", (code) => process.exit(code ?? 0));
