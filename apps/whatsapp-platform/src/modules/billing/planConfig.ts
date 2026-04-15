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
  phoneNumbers?: number | null;
};

export function normalizePlanKey(plan: string | null | undefined): string {
  return normalizePlan(plan);
}

/**
 * Preços do excedente (uso variável).
 * Default: R$0,03/conversa, R$0,09/interação IA.
 */
export function getUsageUnitPricesBrl(): { message: number; aiResponse: number } {
  return {
    message: Math.max(0, parseFloat(process.env.BILLING_PRICE_MESSAGE_BRL ?? "0.03") || 0.03),
    aiResponse: Math.max(0, parseFloat(process.env.BILLING_PRICE_AI_BRL ?? "0.09") || 0.09),
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
    phoneNumbers: limits.phoneNumbers,
  };
}

export function isBillingEnforceLimits(): boolean {
  return process.env.BILLING_ENFORCE_LIMITS !== "false";
}

/**
 * Por defeito, planos pagos não bloqueiam envio ao ultrapassar o pacote incluído (soft limit + meter).
 * Defina `BILLING_HARD_BLOCK_PAID_MESSAGES=true` para recuperar o comportamento «teto duro» em mensagens.
 */
export function isBillingHardBlockPaidMessages(): boolean {
  return process.env.BILLING_HARD_BLOCK_PAID_MESSAGES === "true";
}
