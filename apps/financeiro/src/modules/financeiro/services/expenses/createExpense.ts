import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import { trackFirstExpenseCreated } from "@/analytics/growth";
import { trackFunnelFirst, trackToolUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type CreateExpenseInput = {
  categoryId?: string;
  category?: string;
  amount: number;
  dueDate: string;
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

export async function createExpense(
  prisma: PrismaClient,
  householdId: string,
  data: CreateExpenseInput,
  auditContext: AuditContext
) {
  let categoryName = data.category?.trim();
  if (data.categoryId && !categoryName) {
    const cat = await prisma.category.findFirst({
      where: { id: data.categoryId, householdId },
      select: { name: true },
    });
    categoryName = cat?.name ?? "Outros";
  }
  if (!categoryName) categoryName = "Outros";

  const expense = await prisma.expense.create({
    data: {
      householdId,
      categoryId: data.categoryId ?? null,
      category: categoryName,
      amount: data.amount,
      dueDate: dateInputToDate(data.dueDate),
      sourceId: data.sourceId ?? null,
      isRecurring: data.isRecurring ?? false,
      status: data.status ?? "PENDING",
      note: undefined,
      paidAmount: data.paidAmount ?? null,
      paidAt: data.paidAt ? dateInputToDate(data.paidAt) : null,
    },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.EXPENSE_CREATED,
    entityType: AUDIT_ENTITY.EXPENSE,
    entityId: expense.id,
    metadata: { category: expense.category, amount: expense.amount },
  });

  emit("finance.expense.created", {
    householdId,
    userId: auditContext.userId,
    entityId: expense.id,
    timestamp: new Date().toISOString(),
  });

  const analyticsContext = { userId: auditContext.userId, householdId };
  trackToolUsage("expenses", analyticsContext);
  if (trackFunnelFirst("finance.funnel.first_expense_created", analyticsContext)) {
    trackFirstExpenseCreated(analyticsContext);
  }

  return expense;
}
