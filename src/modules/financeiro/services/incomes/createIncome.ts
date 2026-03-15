import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";
import { trackFirstIncomeCreated } from "@/analytics/growth";
import { trackFunnelFirst, trackToolUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type CreateIncomeInput = {
  sourceId?: string;
  amount: number;
  receivedAt: string;
  isRecurring?: boolean;
  status?: "SCHEDULED" | "RECEIVED";
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function createIncome(
  prisma: PrismaClient,
  householdId: string,
  data: CreateIncomeInput,
  auditContext: AuditContext
) {
  const { sourceId, ...rest } = data;
  const income = await prisma.income.create({
    data: {
      ...rest,
      receivedAt: dateInputToDate(rest.receivedAt),
      householdId,
      ...(sourceId ? { sourceId } : {}),
    },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.INCOME_CREATED,
    entityType: AUDIT_ENTITY.INCOME,
    entityId: income.id,
    metadata: { amount: income.amount, receivedAt: income.receivedAt },
  });

  emit("finance.income.created", {
    householdId,
    userId: auditContext.userId,
    entityId: income.id,
    timestamp: new Date().toISOString(),
  });

  const analyticsContext = { userId: auditContext.userId, householdId };
  trackToolUsage("incomes", analyticsContext);
  if (trackFunnelFirst("finance.funnel.first_income_created", analyticsContext)) {
    trackFirstIncomeCreated(analyticsContext);
  }

  return income;
}
