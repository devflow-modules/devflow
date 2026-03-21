/**
 * Plan capabilities — preparação para feature gating.
 * Retorna limites e features habilitadas por plano.
 */

import { getPlan, normalizePlan, type PlanKey, type PlanFeatures } from "./plans";

export type PlanCapabilities = {
  plan: PlanKey;
  maxMessages: number | null;
  maxAIUsage: number | null;
  maxAutomations: number | null;
  maxUsers: number | null;
  maxPhoneNumbers: number | null;
  featuresEnabled: PlanFeatures;
};

/**
 * Retorna as capabilities do plano para feature gating.
 * Use para verificar limites antes de operações e habilitar/desabilitar UI.
 */
export function getTenantPlanCapabilities(plan: string | null | undefined): PlanCapabilities {
  const def = getPlan(plan);
  const key = normalizePlan(plan) as PlanKey;

  return {
    plan: key,
    maxMessages: def.limits.messagesPerMonth,
    maxAIUsage: def.limits.aiCallsPerMonth,
    maxAutomations: def.limits.automationsPerMonth,
    maxUsers: def.limits.users,
    maxPhoneNumbers: def.limits.phoneNumbers,
    featuresEnabled: def.features,
  };
}
