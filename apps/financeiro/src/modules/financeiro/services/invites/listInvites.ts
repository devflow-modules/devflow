import type { PrismaClient } from "@prisma/client";

export async function listInvites(prisma: PrismaClient, householdId: string) {
  return prisma.invite.findMany({
    where: {
      householdId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
}
