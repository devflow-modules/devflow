import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type SetActiveHouseholdResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" };

export async function setActiveHousehold(
  prisma: PrismaClient,
  userId: string,
  householdId: string,
  previousHouseholdId: string | null
): Promise<SetActiveHouseholdResult> {
  const membership = await prisma.householdMembership.findFirst({
    where: { userId, householdId },
  });

  if (!membership) {
    return { ok: false, code: "FORBIDDEN" };
  }

  await createAuditLog(prisma, {
    userId,
    householdId,
    action: AUDIT_ACTIONS.ACTIVE_HOUSEHOLD_SET,
    entityType: AUDIT_ENTITY.HOUSEHOLD,
    entityId: householdId,
    metadata: { previousHouseholdId },
  });

  return { ok: true };
}
