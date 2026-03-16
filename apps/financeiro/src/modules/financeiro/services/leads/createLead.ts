import type { PrismaClient } from "@prisma/client";

export type CreateLeadInput = {
  email: string;
  source?: string | null;
};

export async function createLead(prisma: PrismaClient, data: CreateLeadInput) {
  await prisma.financeiroLead.create({
    data: {
      email: data.email.trim().toLowerCase(),
      source: data.source ?? "",
    },
  });
}
