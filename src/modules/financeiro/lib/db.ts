import { PrismaClient } from "@prisma/client";

/** Root schema client type. Cast to any to avoid Vercel Prisma 6 generic resolution. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaRoot = any;

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

const _prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = _prisma;
}

/** Root Prisma client (WhatsappConversation, WhatsappOnboardingState, etc). Typed as PrismaRoot for Vercel. */
export const prisma = _prisma as PrismaRoot;
