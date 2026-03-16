import type { PrismaClient } from "@prisma/client";

export type MemberItem = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  isMe: boolean;
};

export async function listMembers(
  prisma: PrismaClient,
  householdId: string,
  currentUserId: string
): Promise<{ members: MemberItem[] }> {
  const memberships = await prisma.householdMembership.findMany({
    where: { householdId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const members: MemberItem[] = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    createdAt: m.createdAt,
    isMe: m.userId === currentUserId,
  }));

  return { members };
}
