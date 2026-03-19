/**
 * Preços e limites parametrizáveis por env (backend apenas).
 */

export interface PlanLimits {
  messagesPerMonth: number | null;
  aiResponsesPerMonth: number | null;
}

export function normalizePlanKey(plan: string | null | undefined): string {
  const p = (plan ?? "FREE").toLowerCase();
  if (p === "starter") return "FREE";
  return p.toUpperCase();
}

export function getUsageUnitPricesBrl(): { message: number; aiResponse: number } {
  return {
    message: Math.max(0, parseFloat(process.env.BILLING_PRICE_MESSAGE_BRL ?? "0.05") || 0.05),
    aiResponse: Math.max(0, parseFloat(process.env.BILLING_PRICE_AI_BRL ?? "0.10") || 0.1),
  };
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const key = normalizePlanKey(plan);
  if (key === "FREE") {
    return { messagesPerMonth: 500, aiResponsesPerMonth: 50 };
  }
  if (key === "PRO") {
    return { messagesPerMonth: 10_000, aiResponsesPerMonth: 2000 };
  }
  if (key === "SCALE" || key === "TEAM") {
    return { messagesPerMonth: null, aiResponsesPerMonth: null };
  }
  return { messagesPerMonth: 500, aiResponsesPerMonth: 50 };
}

export function isBillingEnforceLimits(): boolean {
  return process.env.BILLING_ENFORCE_LIMITS === "true";
}
