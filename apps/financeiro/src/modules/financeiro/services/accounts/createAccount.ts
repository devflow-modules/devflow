import type { PrismaClient } from "@prisma/client";

export type CreateAccountInput = {
  name: string;
  type: "PERSONAL" | "SHARED" | "BUSINESS";
};

export async function createAccount(
  prisma: PrismaClient,
  householdId: string,
  data: CreateAccountInput
) {
  return prisma.account.create({
    data: {
      householdId,
      name: data.name.trim(),
      type: data.type,
    },
    include: { participants: true },
  });
}
