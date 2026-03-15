import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import { emit } from "@/modules/financeiro/events";

export type UpdateExpenseInput = {
  category?: string;
  amount?: number;
  dueDate?: string;
  status?: "PENDING" | "PAID" | "SCHEDULED";
  sourceId?: string;
  isRecurring?: boolean;
  paidAmount?: number;
  paidAt?: string;
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function updateExpense(
  prisma: PrismaClient,
  expenseId: string,
  householdId: string,
  data: UpdateExpenseInput,
  auditContext: AuditContext
) {
  const updateData: Record<string, unknown> = {
    ...data,
    ...(data.dueDate ? { dueDate: dateInputToDate(data.dueDate) } : {}),
    ...(data.paidAt ? { paidAt: dateInputToDate(data.paidAt) } : {}),
  };

  if (data.status && data.status !== "PAID") {
    updateData.paidAt = null;
    updateData.paidAmount = null;
  }

  const result = await prisma.expense.updateMany({
    where: { id: expenseId, householdId },
    data: updateData,
  });

  if (result.count === 0) return null;

  const updated = await prisma.expense.findUnique({ where: { id: expenseId } });

  if (updated) {
    await createAuditLog(prisma, {
      userId: auditContext.userId,
      householdId: auditContext.householdId,
      action: AUDIT_ACTIONS.EXPENSE_UPDATED,
      entityType: AUDIT_ENTITY.EXPENSE,
      entityId: updated.id,
      metadata: { category: updated.category, amount: updated.amount },
    });
    emit("finance.expense.updated", {
      householdId,
      userId: auditContext.userId,
      entityId: updated.id,
      timestamp: new Date().toISOString(),
    });
  }

  return updated;
}
