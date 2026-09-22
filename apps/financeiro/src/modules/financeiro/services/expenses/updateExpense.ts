import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import { emit } from "@/modules/financeiro/events";
import {
  assertHouseholdRefs,
  type HouseholdRefDenied,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

export type UpdateExpenseInput = {
  categoryId?: string | null;
  category?: string;
  amount?: number;
  dueDate?: string;
  status?: "PENDING" | "PAID" | "SCHEDULED";
  sourceId?: string | null;
  isRecurring?: boolean;
  paidAmount?: number;
  paidAt?: string;
  note?: string;
  context?: "PERSONAL" | "BUSINESS" | "SHARED";
  accountId?: string | null;
  paidByParticipantId?: string | null;
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
): Promise<HouseholdRefDenied | Awaited<ReturnType<PrismaClient["expense"]["findUnique"]>>> {
  let accountIdForRefs = data.accountId;
  if (data.paidByParticipantId && !accountIdForRefs) {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, householdId },
      select: { accountId: true },
    });
    accountIdForRefs = existing?.accountId ?? undefined;
  }

  const refs = await assertHouseholdRefs(prisma, householdId, {
    sourceIds: data.sourceId ? [data.sourceId] : undefined,
    accountId: accountIdForRefs,
    categoryId: data.categoryId ? data.categoryId : undefined,
    paidByParticipantId: data.paidByParticipantId,
  });
  if (!refs.ok) return refs;

  let categoryName: string | undefined;
  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId, householdId },
        select: { name: true },
      });
      categoryName = cat?.name ?? data.category;
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
    ...(data.accountId !== undefined && { accountId: data.accountId ?? null }),
    ...(data.paidByParticipantId !== undefined && {
      paidByParticipantId: data.paidByParticipantId ?? null,
    }),
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
