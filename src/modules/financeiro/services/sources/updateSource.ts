import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type UpdateSourceInput = {
  name?: string;
  sourceType?: "PJ" | "PF";
  description?: string | null;
  isActive?: boolean;
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function updateSource(
  prisma: PrismaClient,
  sourceId: string,
  householdId: string,
  data: UpdateSourceInput,
  auditContext: AuditContext
) {
  const updatedCount = await prisma.source.updateMany({
    where: { id: sourceId, householdId },
    data,
  });
  if (updatedCount.count === 0) return null;

  const updated = await prisma.source.findUnique({ where: { id: sourceId } });
  if (updated) {
    await createAuditLog(prisma, {
      userId: auditContext.userId,
      householdId: auditContext.householdId,
      action: AUDIT_ACTIONS.SOURCE_UPDATED,
      entityType: AUDIT_ENTITY.SOURCE,
      entityId: updated.id,
      metadata: { name: updated.name, sourceType: updated.sourceType },
    });
  }
  return updated;
}
