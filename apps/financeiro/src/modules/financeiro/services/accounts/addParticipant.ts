import type { PrismaClient } from "@prisma/client";

export type AddParticipantInput = {
  name: string;
  defaultShare: number; // 0..1
  userId?: string;
};

export async function addParticipant(
  prisma: PrismaClient,
  accountId: string,
  householdId: string,
  data: AddParticipantInput
) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    select: { id: true },
  });
  if (!account) return null;

  const participantsCount = await prisma.accountParticipant.count({
    where: { accountId },
  });

  return prisma.accountParticipant.create({
    data: {
      accountId,
      name: data.name.trim(),
      defaultShare: Math.min(1, Math.max(0, data.defaultShare)),
      userId: data.userId ?? null,
      sortOrder: participantsCount,
    },
  });
}
