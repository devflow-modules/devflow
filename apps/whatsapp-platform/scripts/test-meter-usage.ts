#!/usr/bin/env tsx
/**
 * Teste manual de reportMessageUsage / reportAiUsage.
 * Uso: pnpm tsx scripts/test-meter-usage.ts [tenantId] [quantity]
 *
 * Exemplo Starter (1000 incluídas):
 *   pnpm tsx scripts/test-meter-usage.ts tenant_test 1200
 *   → 1000 internal, 200 enviados ao Stripe (meter event value=200)
 *
 * Validar: Stripe Dashboard → Billing → Meter events
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env.local") });
config({ path: path.resolve(__dirname, "../.env.local") });
import { reportMessageUsage } from "../src/modules/billing/application/reportMessageUsage";
import { reportAiUsage } from "../src/modules/billing/application/reportAiUsage";

const tenantId = process.argv[2] ?? "tenant_test";
const quantity = parseInt(process.argv[3] ?? "1200", 10);

async function main() {
  console.log("--- Teste Meter Events ---");
  console.log("tenantId:", tenantId, "| quantity:", quantity);
  console.log("");

  const msg = await reportMessageUsage({ tenantId, quantity });
  console.log("reportMessageUsage:", msg.ok ? "OK" : `ERRO: ${msg.error}`);

  const ai = await reportAiUsage({ tenantId, quantity: 10 });
  console.log("reportAiUsage(10):", ai.ok ? "OK" : `ERRO: ${ai.error}`);

  console.log("");
  console.log("→ Stripe Dashboard → Billing → Meter events (validar value)");
}

main().catch(console.error);
