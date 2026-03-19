/**
 * Preços e limites parametrizáveis por env (backend apenas).
 * Delega limites de planos para plans.ts (fonte única).
 */

import { getPlan, normalizePlan } from "./plans";

export type PlanLimits = {
  messagesPerMonth: number | null;
  aiResponsesPerMonth: number | null;
  automationsPerMonth?: number | null;
  users?: number | null;
};

export function normalizePlanKey(plan: string | null | undefined): string {
  return normalizePlan(plan);
}

export function getUsageUnitPricesBrl(): { message: number; aiResponse: number } {
  return {
    message: Math.max(0, parseFloat(process.env.BILLING_PRICE_MESSAGE_BRL ?? "0.05") || 0.05),
    aiResponse: Math.max(0, parseFloat(process.env.BILLING_PRICE_AI_BRL ?? "0.10") || 0.1),
  };
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const def = getPlan(plan);
  const limits = def.limits;
  return {
    messagesPerMonth: limits.messagesPerMonth,
    aiResponsesPerMonth: limits.aiCallsPerMonth,
    automationsPerMonth: limits.automationsPerMonth,
    users: limits.users,
  };
}

export function isBillingEnforceLimits(): boolean {
  return process.env.BILLING_ENFORCE_LIMITS !== "false";
}
