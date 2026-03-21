import { PrismaClient } from "@/generated/prisma-whatsapp";

const globalForPrisma = globalThis as unknown as { prismaWhatsapp: PrismaClient | undefined };

export const prismaWhatsapp =
  globalForPrisma.prismaWhatsapp ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaWhatsapp = prismaWhatsapp;
