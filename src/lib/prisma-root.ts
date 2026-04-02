import { PrismaClient } from "@prisma/client";

/** Cliente Prisma do schema raiz do monorepo (portal): WhatsApp, billing portal, revenue, conversas admin, etc. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaRoot = any;

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

const _prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = _prisma;
}

export const prisma = _prisma as PrismaRoot;
