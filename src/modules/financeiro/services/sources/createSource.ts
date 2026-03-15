import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type CreateSourceInput = {
  name: string;
  sourceType: "PJ" | "PF";
  description?: string | null;
  isActive?: boolean;
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function createSource(
  prisma: PrismaClient,
  householdId: string,
  data: CreateSourceInput,
  auditContext: AuditContext
) {
  const source = await prisma.source.create({
    data: {
      ...data,
      householdId,
    },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.SOURCE_CREATED,
    entityType: AUDIT_ENTITY.SOURCE,
    entityId: source.id,
    metadata: { name: source.name, sourceType: source.sourceType },
  });

  return source;
}
