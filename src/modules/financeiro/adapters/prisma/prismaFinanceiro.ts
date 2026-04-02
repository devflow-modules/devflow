import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma-root";

/**
 * Schema raiz do portal (ex.: leads de aquisição). Produto canónico: `apps/financeiro`.
 */
export function getPrisma(): PrismaClient {
  return prisma;
}

export { prisma } from "@/lib/prisma-root";
