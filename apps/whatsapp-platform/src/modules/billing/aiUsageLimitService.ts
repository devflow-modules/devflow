/**
 * Limites de IA por plano — conecta ai_usage_logs ao plano do tenant.
 * Fonte: ai_usage_logs (AI_SUCCESS) + planConfig.
 */

import { getTenantPlan } from "./subscriptionService";
import { getPlanLimits } from "./planConfig";
import { getAiUsageMetrics, periodYYYYMM } from "@/modules/ai/aiUsageService";
import type { PlanKey } from "./plans";

export interface AiUsageStatus {
  used: number;
  limit: number | null;
  percentUsed: number | null;
  canUse: boolean;
  shouldFallbackToLegacy: boolean;
  period: string;
  plan: PlanKey;
}

/**
 * Retorna status de uso de IA: usado, limite, percentual, se pode continuar.
 */
export async function getAiUsageStatus(
  tenantId: string,
  period?: string
): Promise<AiUsageStatus> {
  const p = period ?? periodYYYYMM();
  const [plan, metrics] = await Promise.all([
    getTenantPlan(tenantId),
    getAiUsageMetrics(tenantId, p),
  ]);

  const limits = getPlanLimits(plan);
  const used = metrics.aiMessagesTotal;
  const limit = limits.aiResponsesPerMonth;

  const canUse = limit == null ? true : used < limit;
  const shouldFallbackToLegacy = !canUse;
  const percentUsed =
    limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;

  return {
    used,
    limit,
    percentUsed,
    canUse,
    shouldFallbackToLegacy,
    period: p,
    plan: plan as PlanKey,
  };
}

export interface AiPlanInfo {
  plan: PlanKey;
  planName: string;
  aiLimit: number | null;
  aiLimitLabel: string;
}

/**
 * Retorna informações do plano do tenant para IA.
 */
export async function getAiPlanInfo(tenantId: string): Promise<AiPlanInfo> {
  const plan = await getTenantPlan(tenantId);
  const limits = getPlanLimits(plan);
  const { getPlan } = await import("./plans");
  const def = getPlan(plan);

  return {
    plan: plan as PlanKey,
    planName: def.name,
    aiLimit: limits.aiResponsesPerMonth,
    aiLimitLabel:
      limits.aiResponsesPerMonth == null
        ? "Ilimitado"
        : `${limits.aiResponsesPerMonth.toLocaleString()}/mês`,
  };
}
