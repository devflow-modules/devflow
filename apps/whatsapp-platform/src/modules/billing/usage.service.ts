/**
 * Controle de uso por métrica (UsageMetric + UsageAggregate).
 * incrementUsage: só AUTOMATIONS e USERS (via UsageMetric).
 * getUsage/checkLimit: suportam MESSAGES e AI_CALLS via UsageAggregate.
 */

import { prisma } from "@/lib/prisma";
import { UsageMetricType } from "@/generated/prisma-whatsapp";
import { getUsageByPeriod, periodYYYYMM } from "./usageService";
import { getPlanLimits } from "./planConfig";
import { getTenantPlan } from "./subscriptionService";

const METRIC_TO_PLAN_KEY: Partial<
  Record<UsageMetricType, keyof ReturnType<typeof getPlanLimits>>
> = {
  AUTOMATIONS: "automationsPerMonth",
  USERS: "users",
  MESSAGES: "messagesPerMonth",
  AI_CALLS: "aiResponsesPerMonth",
};

/** Incrementa uso. Só AUTOMATIONS e USERS usam UsageMetric. */
export async function incrementUsage(
  tenantId: string,
  metric: UsageMetricType,
  amount = 1
): Promise<void> {
  if (metric === "MESSAGES" || metric === "AI_CALLS") return; // trackUsage em usageService
  const period = periodYYYYMM();
  await prisma.usageMetric.upsert({
    where: {
      tenantId_metricType_period: { tenantId, metricType: metric, period },
    },
    create: { tenantId, metricType: metric, value: amount, period },
    update: { value: { increment: amount } },
  });
}

/** Retorna o valor atual da métrica no período. */
export async function getUsage(
  tenantId: string,
  metric: UsageMetricType,
  period?: string
): Promise<number> {
  const p = period ?? periodYYYYMM();
  if (metric === "MESSAGES") {
    const u = await getUsageByPeriod(tenantId, p);
    return u.messagesSent;
  }
  if (metric === "AI_CALLS") {
    const u = await getUsageByPeriod(tenantId, p);
    return u.aiResponses;
  }
  const row = await prisma.usageMetric.findUnique({
    where: {
      tenantId_metricType_period: { tenantId, metricType: metric, period: p },
    },
  });
  return row?.value ?? 0;
}

/** Verifica se está dentro do limite. Se exceder, retorna LIMIT_REACHED. */
export async function checkLimit(
  tenantId: string,
  metric: UsageMetricType
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const plan = await getTenantPlan(tenantId);
  const limits = getPlanLimits(plan);
  const planKey = METRIC_TO_PLAN_KEY[metric];
  const limit = planKey ? limits[planKey] : null;
  if (limit == null) return { ok: true };

  const usage = await getUsage(tenantId, metric);
  if (usage >= limit) {
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: "Upgrade your plan",
    };
  }
  return { ok: true };
}
