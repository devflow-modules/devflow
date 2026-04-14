/**
 * Capacidades derivadas exclusivamente de `plans.ts` para UI, copy e documentação.
 * Não duplica regras de negócio — apenas espelha flags e limites já definidos no plano.
 */

import { PLANS, normalizePlan, type PlanFeatures, type PlanKey, type PlanLimits } from "./plans";

export type UiPlanCapabilities = {
  planKey: PlanKey;
  limits: PlanLimits;
  features: PlanFeatures;
  /** Filas e tags (QUEUES_TAGS) */
  hasQueuesAndTags: boolean;
  /** Automação base (AUTOMATION) */
  hasAutomation: boolean;
  /** Fluxos / playbooks avançados (ADVANCED_AUTOMATION) */
  hasAdvancedAutomation: boolean;
  /** Respostas IA (AI_RESPONSE) */
  hasAiResponse: boolean;
  /** IA avançada / modelo premium (ADVANCED_AI) — só Scale */
  hasAdvancedAi: boolean;
  /** API e webhooks (WEBHOOKS_API) */
  hasWebhooksApi: boolean;
  /** Relatórios avançados (ADVANCED_REPORTS) */
  hasAdvancedReports: boolean;
  /** Vários utilizadores na mesma conta (MULTI_USER) */
  hasMultiUser: boolean;
  /** Suporte prioritário (PRIORITY_SUPPORT) */
  hasPrioritySupport: boolean;
};

/**
 * Snapshot tipado das capacidades do plano para comparação na UI e validação de copy.
 * Use no cliente (só leitura de PLANS) ou no servidor.
 */
export function getUiPlanCapabilities(plan: string | null | undefined): UiPlanCapabilities {
  const planKey = normalizePlan(plan);
  const def = PLANS[planKey];
  const f = def.features;

  return {
    planKey,
    limits: { ...def.limits },
    features: { ...f },
    hasQueuesAndTags: f.QUEUES_TAGS === true,
    hasAutomation: f.AUTOMATION === true,
    hasAdvancedAutomation: f.ADVANCED_AUTOMATION === true,
    hasAiResponse: f.AI_RESPONSE === true,
    hasAdvancedAi: f.ADVANCED_AI === true,
    hasWebhooksApi: f.WEBHOOKS_API === true,
    hasAdvancedReports: f.ADVANCED_REPORTS === true,
    hasMultiUser: f.MULTI_USER === true,
    hasPrioritySupport: f.PRIORITY_SUPPORT === true,
  };
}
