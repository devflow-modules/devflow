import { PrismaClient } from "@/generated/prisma-whatsapp";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Pooler Supabase (PgBouncer) + Prisma: sem `pgbouncer=true` na URL o Postgres devolve
 * 42P05 "prepared statement already exists". O dev script já corrige; em produção (ex. Vercel)
 * a variável tem de vir certa — normalizamos aqui como rede de segurança.
 */
function normalizeWhatsappDatabaseUrlForPgbouncer(): void {
  const key = "WHATSAPP_DATABASE_URL";
  const raw = process.env[key];
  if (!raw?.trim() || raw.includes("pgbouncer=true")) return;

  const poolerHost = raw.includes("pooler");
  const supabasePoolerPort = raw.includes("supabase.co") && raw.includes(":6543");
  if (!poolerHost && !supabasePoolerPort) return;

  process.env[key] = raw.includes("?") ? `${raw}&pgbouncer=true` : `${raw}?pgbouncer=true`;
  console.warn(
    `[prisma] ${key}: adicionado pgbouncer=true (pooler + Prisma). Prefira definir explicitamente no deploy.`
  );
}

normalizeWhatsappDatabaseUrlForPgbouncer();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

// Singleton em produção também — evita múltiplas instâncias no serverless (Vercel)
// e reduz risco de "prepared statement already exists" com pooler.
globalForPrisma.prisma = prisma;
