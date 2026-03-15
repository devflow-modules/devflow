import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function deleteSource(
  prisma: PrismaClient,
  sourceId: string,
  householdId: string,
  auditContext: AuditContext
) {
  const deleted = await prisma.source.deleteMany({
    where: { id: sourceId, householdId },
  });
  if (deleted.count === 0) return false;

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.SOURCE_DELETED,
    entityType: AUDIT_ENTITY.SOURCE,
    entityId: sourceId,
  });

  return true;
}
