/**
 * Validação explícita de variáveis críticas em produção.
 * Evita arranque “mudo” com env incompleta (falha cedo com mensagem clara).
 *
 * Desligar temporariamente (emergência): SKIP_ENV_VALIDATION=1
 */

import { z } from "zod";

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

/**
 * Lança erro com mensagem agregada se a configuração de produção for inválida.
 * Não chamar em testes unitários sem definir NODE_ENV adequadamente.
 */
export function validateProductionServerEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    console.warn("[env] SKIP_ENV_VALIDATION=1 — validação de produção ignorada");
    return;
  }

  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    WHATSAPP_DATABASE_URL: process.env.WHATSAPP_DATABASE_URL,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    NEXT_PUBLIC_WHATSAPP_APP_URL: process.env.NEXT_PUBLIC_WHATSAPP_APP_URL,
  };

  const result = productionCoreSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`[env] Configuração de produção inválida: ${msg}`);
  }
}
