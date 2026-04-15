/**
 * Enforcement de uso por plano.
 * - FREE: limite incluído é teto duro (mensagens e IA); sem cobrança adicional.
 * - OPERATIONAL_BASE (e legados normalizados): IA além do incluído → meter; mensagens → soft limit por defeito
 *   (ver `BILLING_HARD_BLOCK_PAID_MESSAGES` + `BILLING_ENFORCE_LIMITS`).
 */

import { getTenantBillingContext } from "./subscriptionService";
import { getUsageByPeriod, periodYYYYMM } from "./usageService";
import { getAiUsageMetrics } from "@/modules/ai/aiUsageService";
import { isBillingEnforceLimits, isBillingHardBlockPaidMessages } from "./planConfig";
import {
  logHighWaterMessagesCrossing5000,
  logLimitExceeded,
  logSoftMessageOverIncluded,
  logUsageThresholdWarning,
} from "./billingObserverService";
import { bumpMetric, logEvent } from "@/lib/observability";
import type { PlanKey } from "./plans";
import { planAllowsMeteredOverage } from "./plans";

export type EnforcementFeature = "messages" | "ai";

export type UsageLimitErrorCode = "USAGE_LIMIT_EXCEEDED" | "FREE_PLAN_LIMIT_REACHED";

export type EnforceUsageInput = {
  tenantId: string;
  feature: EnforcementFeature;
  quantity?: number;
};

export class UsageLimitExceededError extends Error {
  override readonly name = "UsageLimitExceededError";
  readonly code: UsageLimitErrorCode;
  readonly feature: string;
  readonly currentPlan: PlanKey;
  readonly upgradeRequired: boolean;

  constructor(
    feature: string,
    message?: string,
    options?: {
      code?: UsageLimitErrorCode;
      currentPlan?: PlanKey;
      upgradeRequired?: boolean;
    }
  ) {
    super(message ?? `Limite de uso atingido para ${feature}`);
    this.feature = feature;
    this.currentPlan = options?.currentPlan ?? "FREE";
    this.upgradeRequired = options?.upgradeRequired ?? true;
    this.code = options?.code ?? "USAGE_LIMIT_EXCEEDED";
  }
}

/** Payload estável para APIs 402 / cliente. */
export function usageLimitErrorToPayload(e: UsageLimitExceededError): {
  message: string;
  code: UsageLimitErrorCode;
  currentPlan: PlanKey;
  upgradeRequired: boolean;
  feature: string;
} {
  return {
    message: e.message,
    code: e.code,
    currentPlan: e.currentPlan,
    upgradeRequired: e.upgradeRequired,
    feature: e.feature,
  };
}

function buildLimitExceededError(
  plan: PlanKey,
  feature: EnforcementFeature
): UsageLimitExceededError {
  const isFree = !planAllowsMeteredOverage(plan);
  const msg =
    feature === "messages"
      ? isFree
        ? "Limite de conversas do plano gratuito atingido. Escolha um plano para continuar."
        : "Limite mensal de conversas atingido. Atualize o plano ou aguarde a renovação do período."
      : isFree
        ? "Limite de interações de IA do plano gratuito atingido. Escolha um plano para continuar."
        : "Limite mensal de interações de IA atingido. Atualize o plano ou aguarde a renovação do período.";

  return new UsageLimitExceededError(feature, msg, {
    code: isFree ? "FREE_PLAN_LIMIT_REACHED" : "USAGE_LIMIT_EXCEEDED",
    currentPlan: plan,
    upgradeRequired: true,
  });
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
 * Verifica se o uso está dentro do limite. FREE bloqueia sempre ao ultrapassar.
 * Plano pago: IA acima do incluído não bloqueia (meter). Mensagens: soft limit por defeito; teto duro só com
 * `BILLING_HARD_BLOCK_PAID_MESSAGES=true` e `BILLING_ENFORCE_LIMITS=true`.
 */
export async function enforceUsageOrThrow(input: EnforceUsageInput): Promise<void> {
  const { tenantId, feature, quantity = 1 } = input;

  const { plan, capabilities: caps } = await getTenantBillingContext(tenantId);

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

  // Acima do limite incluído
  if (feature === "ai") {
    if (!planAllowsMeteredOverage(plan)) {
      logLimitExceeded(tenantId, feature);
      logEnforcement(tenantId, feature, used, limit, true);
      bumpMetric("billing_enforcement_blocked");
      logEvent(
        "warn",
        "billing",
        "usage_limit_blocked",
        { feature, plan, used, limit: limit ?? null },
        { tenant_id: tenantId }
      );
      throw buildLimitExceededError(plan, "ai");
    }
    logEnforcement(tenantId, feature, used, limit, false);
    return;
  }

  // messages — FREE: bloqueio; pago: soft limit por defeito (log + meter), teto duro só com env explícito
  const blockMessages =
    !planAllowsMeteredOverage(plan) ||
    (isBillingEnforceLimits() && isBillingHardBlockPaidMessages());
  if (blockMessages) {
    logLimitExceeded(tenantId, feature);
    logEnforcement(tenantId, feature, used, limit, true);
    bumpMetric("billing_enforcement_blocked");
    logEvent(
      "warn",
      "billing",
      "usage_limit_blocked",
      { feature, plan, used, limit: limit ?? null },
      { tenant_id: tenantId }
    );
    throw buildLimitExceededError(plan, "messages");
  }

  logSoftMessageOverIncluded(tenantId, used, limit, afterAction);
  logHighWaterMessagesCrossing5000(tenantId, used, afterAction);
  logEnforcement(tenantId, feature, used, limit, false);
}
