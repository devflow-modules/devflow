import { PrismaClient } from "@/generated/prisma-whatsapp";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

// Singleton em produção também — evita múltiplas instâncias no serverless (Vercel)
// e reduz risco de "prepared statement already exists" com pooler.
globalForPrisma.prisma = prisma;
