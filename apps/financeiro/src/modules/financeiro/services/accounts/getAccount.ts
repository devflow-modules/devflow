import type { PrismaClient } from "@prisma/client";

export async function getAccount(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
) {
  return prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: {
      participants: { orderBy: { sortOrder: "asc" } },
      expenses: {
        orderBy: { dueDate: "desc" },
        include: { splits: { include: { participant: true } }, paidByParticipant: true },
      },
    },
  });
}
