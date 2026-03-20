#!/usr/bin/env node
/**
 * Carrega .env.local do monorepo root, depois executa prisma migrate deploy.
 * Uso: pnpm db:migrate
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env.local");
const appEnv = path.resolve(__dirname, "../.env.local");
const rootResult = config({ path: rootEnv });
const appResult = config({ path: appEnv });
if (!rootResult?.parsed && !appResult?.parsed) {
  console.warn("[db:migrate] Nenhum .env.local carregado. Configure WHATSAPP_DATABASE_URL e WHATSAPP_DIRECT_URL.");
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 0);
