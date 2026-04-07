#!/usr/bin/env node
/**
 * Trunca todas as tabelas em public.* exceto _prisma_migrations.
 * Requer .env.local na raiz do monorepo com WHATSAPP_DATABASE_URL / WHATSAPP_DIRECT_URL.
 * Uso: pnpm db:reset-app-data
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env.local");
const appEnv = path.resolve(__dirname, "../.env.local");
config({ path: rootEnv });
config({ path: appEnv });

const sqlFile = path.resolve(__dirname, "../../../scripts/ops/reset-whatsapp-public-data.sql");
const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", sqlFile],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 0);
