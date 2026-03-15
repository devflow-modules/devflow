import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { trackFeatureUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type TransferOwnershipContext = {
  userId: string;
  householdId: string;
};

export type TransferOwnershipResult =
  | {
      ok: true;
      fromUserId: string;
      toUserId: string;
      fromMembershipId: string;
      toMembershipId: string;
    }
  | { ok: false; code: "NOT_OWNER" }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "SAME_USER" }
  | { ok: false; code: "TARGET_MUST_BE_MEMBER" };

export async function transferOwnership(
  prisma: PrismaClient,
  householdId: string,
  newOwnerMembershipId: string,
  context: TransferOwnershipContext
): Promise<TransferOwnershipResult> {
  const callerMembership = await prisma.householdMembership.findFirst({
    where: { userId: context.userId, householdId },
    include: { user: true },
  });
  const newOwnerMembership = await prisma.householdMembership.findFirst({
    where: { id: newOwnerMembershipId, householdId },
    include: { user: true },
  });

  if (!callerMembership || callerMembership.role !== "OWNER") {
    return { ok: false, code: "NOT_OWNER" };
  }
  if (!newOwnerMembership) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (newOwnerMembership.userId === context.userId) {
    return { ok: false, code: "SAME_USER" };
  }
  if (newOwnerMembership.role !== "MEMBER") {
    return { ok: false, code: "TARGET_MUST_BE_MEMBER" };
  }

  await prisma.$transaction([
    prisma.householdMembership.update({
      where: { id: callerMembership.id },
      data: { role: "MEMBER" },
    }),
    prisma.householdMembership.update({
      where: { id: newOwnerMembershipId },
      data: { role: "OWNER" },
    }),
  ]);

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId,
    action: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
    entityType: AUDIT_ENTITY.MEMBERSHIP,
    entityId: newOwnerMembershipId,
    metadata: {
      fromUserId: callerMembership.userId,
      toUserId: newOwnerMembership.userId,
      householdId,
      fromMembershipId: callerMembership.id,
      toMembershipId: newOwnerMembershipId,
    },
  });

  emit("finance.household.transfer", {
    householdId,
    userId: context.userId,
    entityId: newOwnerMembershipId,
    timestamp: new Date().toISOString(),
  });

  trackFeatureUsage("household.transfer", { userId: context.userId, householdId });

  return {
    ok: true,
    fromUserId: callerMembership.userId,
    toUserId: newOwnerMembership.userId,
    fromMembershipId: callerMembership.id,
    toMembershipId: newOwnerMembershipId,
  };
}
