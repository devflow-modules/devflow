import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import {
  assertHouseholdRefs,
  type HouseholdRefDenied,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

export type UpdateIncomeInput = {
  sourceId?: string | null;
  amount?: number;
  receivedAt?: string;
  isRecurring?: boolean;
  status?: "SCHEDULED" | "RECEIVED";
  notes?: string;
  context?: "PERSONAL" | "BUSINESS" | "SHARED";
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function updateIncome(
  prisma: PrismaClient,
  incomeId: string,
  householdId: string,
  data: UpdateIncomeInput,
  auditContext: AuditContext
): Promise<HouseholdRefDenied | Awaited<ReturnType<PrismaClient["income"]["findUnique"]>>> {
  const refs = await assertHouseholdRefs(prisma, householdId, {
    sourceIds: data.sourceId ? [data.sourceId] : undefined,
  });
  if (!refs.ok) return refs;

  const updateData = {
    ...data,
    ...(data.receivedAt ? { receivedAt: dateInputToDate(data.receivedAt) } : {}),
  };

  const result = await prisma.income.updateMany({
    where: { id: incomeId, householdId },
    data: updateData,
  });

  if (result.count === 0) return null;

  const updated = await prisma.income.findUnique({ where: { id: incomeId } });

  if (updated) {
    await createAuditLog(prisma, {
      userId: auditContext.userId,
      householdId: auditContext.householdId,
      action: AUDIT_ACTIONS.INCOME_UPDATED,
      entityType: AUDIT_ENTITY.INCOME,
      entityId: updated.id,
      metadata: { amount: updated.amount, receivedAt: updated.receivedAt },
    });
  }

  return updated;
}
