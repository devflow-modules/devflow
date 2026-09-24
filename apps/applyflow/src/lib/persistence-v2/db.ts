import { PrismaClient } from "@prisma/client";

declare global {
  var applyflowPrisma: PrismaClient | undefined;
}

export const applyflowPrisma = globalThis.applyflowPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.applyflowPrisma = applyflowPrisma;
}
