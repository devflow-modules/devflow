import { PrismaClient } from "@prisma/client";

import { createDeniedApplyFlowPrisma, resolveApplyFlowRuntimeDbAccess } from "./runtime-db-guard";

declare global {
  var applyflowPrisma: PrismaClient | undefined;
}

const access = resolveApplyFlowRuntimeDbAccess();

export const applyflowPrisma: PrismaClient = access.allowed
  ? (globalThis.applyflowPrisma ?? new PrismaClient())
  : createDeniedApplyFlowPrisma<PrismaClient>(access);

if (access.allowed && process.env.NODE_ENV !== "production") {
  globalThis.applyflowPrisma = applyflowPrisma;
}
