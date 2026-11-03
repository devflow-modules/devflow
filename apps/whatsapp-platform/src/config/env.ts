/**
 * Validação explícita de variáveis críticas em Vercel Production (e local `next start`).
 * Evita arranque “mudo” com env incompleta (falha cedo com mensagem clara).
 *
 * `NODE_ENV=production` NÃO implica Vercel Production — Preview/Development na Vercel
 * também usam NODE_ENV=production. A validação rigorosa exige
 * `VERCEL=1` + `VERCEL_ENV=production` (mesma regra que o Stripe guard), ou
 * runtime local sem sinais Vercel com NODE_ENV=production.
 *
 * Desligar temporariamente (emergência): SKIP_ENV_VALIDATION=1
 */

import { z } from "zod";
import {
  isNonProductionHostedDeployment,
  isVerifiedVercelProduction,
  type StripeEnvSnapshot,
} from "@devflow/billing-core";

const productionCoreSchema = z.object({
  NODE_ENV: z.literal("production"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  WHATSAPP_DATABASE_URL: z
    .string()
    .min(8)
    .refine(
      (s) => s.startsWith("postgresql:") || s.startsWith("postgres:"),
      "WHATSAPP_DATABASE_URL deve ser uma connection string PostgreSQL"
    ),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8, "WHATSAPP_VERIFY_TOKEN é obrigatório (mín. 8 caracteres)"),
  NEXT_PUBLIC_WHATSAPP_APP_URL: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "NEXT_PUBLIC_WHATSAPP_APP_URL deve ser HTTPS em produção"),
});

export type ProductionCoreEnv = z.infer<typeof productionCoreSchema>;

export type WhatsappEnvValidationSnapshot = StripeEnvSnapshot & {
  NODE_ENV?: string | undefined;
  SKIP_ENV_VALIDATION?: string | undefined;
};

/**
 * Decide se a validação rigorosa de Production deve correr.
 * Preview / Development / Vercel desconhecido: false (boot degradado sem DB Production).
 */
export function shouldValidateProductionServerEnv(
  env: WhatsappEnvValidationSnapshot = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  }
): boolean {
  if (env.SKIP_ENV_VALIDATION === "1") return false;
  if (isVerifiedVercelProduction(env)) return true;
  // Preview, development, or any hosted non-exact-production Vercel signal
  if (isNonProductionHostedDeployment(env)) return false;
  // Off Vercel: preserve previous local `next start` / CI production checks
  return env.NODE_ENV === "production";
}

/**
 * Lança erro com mensagem agregada se a configuração de Production for inválida.
 * Não chamar em testes unitários sem definir env adequadamente.
 */
export function validateProductionServerEnv(
  env: WhatsappEnvValidationSnapshot & {
    JWT_SECRET?: string | undefined;
    WHATSAPP_DATABASE_URL?: string | undefined;
    WHATSAPP_VERIFY_TOKEN?: string | undefined;
    NEXT_PUBLIC_WHATSAPP_APP_URL?: string | undefined;
  } = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    JWT_SECRET: process.env.JWT_SECRET,
    WHATSAPP_DATABASE_URL: process.env.WHATSAPP_DATABASE_URL,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    NEXT_PUBLIC_WHATSAPP_APP_URL: process.env.NEXT_PUBLIC_WHATSAPP_APP_URL,
  }
): void {
  if (!shouldValidateProductionServerEnv(env)) {
    if (env.SKIP_ENV_VALIDATION === "1") {
      console.warn("[env] SKIP_ENV_VALIDATION=1 — validação de produção ignorada");
    }
    return;
  }

  const raw = {
    NODE_ENV: "production" as const,
    JWT_SECRET: env.JWT_SECRET,
    WHATSAPP_DATABASE_URL: env.WHATSAPP_DATABASE_URL,
    WHATSAPP_VERIFY_TOKEN: env.WHATSAPP_VERIFY_TOKEN,
    NEXT_PUBLIC_WHATSAPP_APP_URL: env.NEXT_PUBLIC_WHATSAPP_APP_URL,
  };

  const result = productionCoreSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`[env] Configuração de produção inválida: ${msg}`);
  }
}
