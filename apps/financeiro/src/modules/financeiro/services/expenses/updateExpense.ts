import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import { emit } from "@/modules/financeiro/events";

export type UpdateExpenseInput = {
  categoryId?: string | null;
  category?: string;
  amount?: number;
  dueDate?: string;
  status?: "PENDING" | "PAID" | "SCHEDULED";
  sourceId?: string;
  isRecurring?: boolean;
  paidAmount?: number;
  paidAt?: string;
  note?: string;
  context?: "PERSONAL" | "BUSINESS" | "SHARED";
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
  let categoryName: string | undefined;
  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId, householdId },
        select: { name: true },
      });
      categoryName = cat?.name ?? "Outros";
    } else {
      categoryName = data.category ?? "Outros";
    }
  } else if (data.category !== undefined) {
    categoryName = data.category;
  }

  const updateData: Record<string, unknown> = {
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.dueDate && { dueDate: dateInputToDate(data.dueDate) }),
    ...(data.paidAt !== undefined && { paidAt: data.paidAt ? dateInputToDate(data.paidAt) : null }),
    ...(data.sourceId !== undefined && { sourceId: data.sourceId ?? null }),
    ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount ?? null }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId ?? null }),
    ...(categoryName !== undefined && { category: categoryName }),
    ...(data.note !== undefined && { note: data.note }),
    ...(data.context !== undefined && { context: data.context }),
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
