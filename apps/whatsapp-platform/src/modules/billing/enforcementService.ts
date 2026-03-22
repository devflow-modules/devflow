/**
 * Enforcement de uso por plano.
 * Bloqueia ou permite conforme BILLING_ENFORCE_LIMITS.
 */

import { getTenantPlan } from "./subscriptionService";
import { getTenantPlanCapabilities } from "./planCapabilities";
import { getUsageByPeriod, periodYYYYMM } from "./usageService";
import { getAiUsageMetrics } from "@/modules/ai/aiUsageService";
import { isBillingEnforceLimits } from "./planConfig";
import { logLimitExceeded, logUsageThresholdWarning } from "./billingObserverService";

export type EnforcementFeature = "messages" | "ai";

export type EnforceUsageInput = {
  tenantId: string;
  feature: EnforcementFeature;
  quantity?: number;
};

export class UsageLimitExceededError extends Error {
  override readonly name = "UsageLimitExceededError";
  readonly code = "USAGE_LIMIT_EXCEEDED" as const;
  readonly feature: string;

  constructor(feature: string, message?: string) {
    super(message ?? `Limite de uso atingido para ${feature}`);
    this.feature = feature;
  }
}

function logEnforcement(
  tenantId: string,
  feature: string,
  used: number,
  limit: number | null,
  blocked: boolean
): void {
  const limitStr = limit ?? "unlimited";
  if (blocked) {
    console.warn(`[USAGE][BLOCKED] tenant=${tenantId} feature=${feature}`);
  } else {
    console.log(`[USAGE] tenant=${tenantId} feature=${feature} used=${used} limit=${limitStr}`);
  }
}

/**
 * Verifica se o uso está dentro do limite. Se BILLING_ENFORCE_LIMITS=true e
 * ultrapassar, lança UsageLimitExceededError. Caso contrário, permite (soft limit).
 */
export async function enforceUsageOrThrow(input: EnforceUsageInput): Promise<void> {
  const { tenantId, feature, quantity = 1 } = input;

  const plan = await getTenantPlan(tenantId);
  const caps = getTenantPlanCapabilities(plan);

  const limit =
    feature === "messages" ? caps.maxMessages : feature === "ai" ? caps.maxAIUsage : null;

  if (limit == null) {
    return;
  }

  const period = periodYYYYMM();
  const used =
    feature === "ai"
      ? (await getAiUsageMetrics(tenantId, period)).aiMessagesTotal
      : (await getUsageByPeriod(tenantId, period)).messagesSent;
  const afterAction = used + quantity;

  if (afterAction <= limit) {
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
    logUsageThresholdWarning(tenantId, feature, used, limit, percent);
    logEnforcement(tenantId, feature, used, limit, false);
    return;
  }

  // Starter/FREE + AI: sempre bloqueia excedente (fallback + upgrade)
  // Pro/Scale + AI: permite excedente (será cobrado via meter events)
  // Messages: respeita BILLING_ENFORCE_LIMITS global
  const allowsAiOverage = plan === "PRO" || plan === "SCALE";
  const blockExceeded =
    feature === "ai"
      ? !allowsAiOverage
      : isBillingEnforceLimits();

  if (blockExceeded) {
    logLimitExceeded(tenantId, feature);
    logEnforcement(tenantId, feature, used, limit, true);
    throw new UsageLimitExceededError(
      feature,
      `Limite mensal de ${feature === "messages" ? "mensagens" : "respostas IA"} atingido. Faça upgrade para continuar.`
    );
  }

  // Pro/Scale + AI: permite excedente (será cobrado via meter events)
  logEnforcement(tenantId, feature, used, limit, false);
}
