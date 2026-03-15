import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/modules/financeiro/lib/db";

/**
 * Ponto único de acesso ao Prisma para o domínio financeiro.
 * Rotas e handlers obtêm o client aqui e passam para os services.
 */
export function getPrisma(): PrismaClient {
  return prisma;
}

export { prisma } from "@/modules/financeiro/lib/db";
