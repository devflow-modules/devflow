import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { trackFeatureUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type RemoveMemberContext = {
  userId: string;
  householdId: string;
  membershipRole: string;
};

export type RemoveMemberResult =
  | { ok: true; isSelf: boolean; nextHouseholdId: string | null }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "FORBIDDEN" }
  | { ok: false; code: "OWNER_CANNOT_LEAVE" }
  | { ok: false; code: "LAST_OWNER" };

export async function removeMember(
  prisma: PrismaClient,
  householdId: string,
  membershipId: string,
  context: RemoveMemberContext
): Promise<RemoveMemberResult> {
  const membership = await prisma.householdMembership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership || membership.householdId !== householdId) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const isSelf = membership.userId === context.userId;
  const isOwner = context.membershipRole === "OWNER";

  if (!isSelf && !isOwner) {
    return { ok: false, code: "FORBIDDEN" };
  }

  if (isSelf && membership.role === "OWNER") {
    return { ok: false, code: "OWNER_CANNOT_LEAVE" };
  }

  if (membership.role === "OWNER") {
    const ownersCount = await prisma.householdMembership.count({
      where: { householdId, role: "OWNER", id: { not: membershipId } },
    });
    if (ownersCount === 0) {
      return { ok: false, code: "LAST_OWNER" };
    }
  }

  await prisma.householdMembership.delete({ where: { id: membershipId } });

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId,
    action: isSelf ? AUDIT_ACTIONS.MEMBER_LEFT : AUDIT_ACTIONS.MEMBER_REMOVED,
    entityType: AUDIT_ENTITY.MEMBERSHIP,
    entityId: membershipId,
    metadata: {
      removedUserId: membership.userId,
      removedEmail: membership.user.email,
      removedRole: membership.role,
      byRole: context.membershipRole,
    },
  });

  emit("finance.household.member_removed", {
    householdId,
    userId: context.userId,
    entityId: membershipId,
    timestamp: new Date().toISOString(),
  });

  trackFeatureUsage("household.member_removed", {
    userId: context.userId,
    householdId,
  });

  let nextHouseholdId: string | null = null;
  if (isSelf) {
    const nextMembership = await prisma.householdMembership.findFirst({
      where: { userId: context.userId },
      orderBy: { createdAt: "asc" },
      select: { householdId: true },
    });
    nextHouseholdId = nextMembership?.householdId ?? null;
  }

  return { ok: true, isSelf, nextHouseholdId };
}
