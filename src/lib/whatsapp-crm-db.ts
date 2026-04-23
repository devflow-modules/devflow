import { PrismaClient } from "@whatsapp/platform-prisma";

let waCrm: PrismaClient | null = null;

/** Cliente Prisma da BD do WhatsApp Platform (validar operador / thread). */
export function getWhatsappCrmPrisma(): PrismaClient {
  if (waCrm) return waCrm;
  const url = process.env.WHATSAPP_DIRECT_URL?.trim() || process.env.WHATSAPP_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("WHATSAPP_DATABASE_URL ou WHATSAPP_DIRECT_URL é necessário para CRM (operador / conversa).");
  }
  waCrm = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return waCrm;
}
