import type { Prisma, PrismaClient } from "@prisma/client";

export const AUDIT_ENTITY = {
  INVITE: "INVITE",
  HOUSEHOLD: "HOUSEHOLD",
  MEMBERSHIP: "MEMBERSHIP",
  SOURCE: "SOURCE",
  RULE: "RULE",
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
} as const;

export const AUDIT_ACTIONS = {
  ACTIVE_HOUSEHOLD_SET: "ACTIVE_HOUSEHOLD_SET",
  HOUSEHOLD_CREATED: "HOUSEHOLD_CREATED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  MEMBER_LEFT: "MEMBER_LEFT",
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_ACCEPTED: "INVITE_ACCEPTED",
  INVITE_REVOKED: "INVITE_REVOKED",
  OWNERSHIP_TRANSFERRED: "OWNERSHIP_TRANSFERRED",
  SOURCE_CREATED: "SOURCE_CREATED",
  SOURCE_UPDATED: "SOURCE_UPDATED",
  SOURCE_DELETED: "SOURCE_DELETED",
  RULE_CREATED: "RULE_CREATED",
  RULE_UPDATED: "RULE_UPDATED",
  RULE_DELETED: "RULE_DELETED",
  EXPENSE_CREATED: "EXPENSE_CREATED",
  EXPENSE_UPDATED: "EXPENSE_UPDATED",
  EXPENSE_DELETED: "EXPENSE_DELETED",
  INCOME_CREATED: "INCOME_CREATED",
  INCOME_UPDATED: "INCOME_UPDATED",
  INCOME_DELETED: "INCOME_DELETED",
} as const;

type AuditLogInput = {
  userId: string;
  householdId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(prisma: PrismaClient, input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        householdId: input.householdId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        ...(input.metadata
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  } catch (error) {
    console.error("Falha ao registrar auditoria", error);
  }
}
