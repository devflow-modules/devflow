/**
 * Copy de gating alinhada à venda consultiva (sem «menu de planos»).
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";
import type { FeatureKey } from "./featureGate";
import { CONTEXTUAL_UPGRADE_HINTS } from "./planPresentation";

/** Mensagem quando FREE atinge limite (API 402 ou paywall contextual). */
export const FREE_PLAN_LIMIT_PAYWALL_MESSAGE =
  "A avaliação chegou ao limite incluído. Para continuar a operar com atendimento completo, ative a operação contratada em Consumo e faturação ou fale connosco.";

export const FEATURE_UPGRADE_COPY: Record<FeatureKey, string | undefined> = {
  QUEUES_TAGS: "Filas e responsáveis fazem parte da operação contratada — fale connosco para incluir no seu pacote.",
  AUTOMATION: "Automação de regras faz parte da operação contratada — veja o que está incluído no seu contrato.",
  ADVANCED_AUTOMATION: "Automação avançada (fluxos mais ricos) — disponível na operação contratada; fale connosco para ajustar.",
  PLAYBOOKS: "Fluxos e automação avançada — alinhados na operação contratada.",
  AI_RESPONSE: "Respostas com IA — conforme o pacote contratado.",
  ADVANCED_AI: "Motores de IA avançados — incluídos quando previstos no contrato.",
  WEBHOOKS_API: "API e integrações — quando fazem parte da implantação acordada.",
  ADVANCED_REPORTS: "Relatórios avançados — incluídos na operação contratada.",
  MULTI_USER: "Vários utilizadores na mesma conta — conforme o pacote de implantação.",
  PRIORITY_SUPPORT: "Suporte prioritário — quando incluído no contrato.",
};

function planDisplayName(plan: PlanKey): string {
  return PLANS[plan].name;
}

/** Mensagem curta para corpo JSON 403. */
export function featureUpgradeShortMessage(feature: FeatureKey, requiredPlan: PlanKey): string {
  const base = FEATURE_UPGRADE_COPY[feature]?.trim();
  const target = planDisplayName(requiredPlan);
  if (base) return `${base} Requisito mínimo: ${target}.`;
  return `Esta funcionalidade requer a operação: ${target}.`;
}

/** Texto para hints preventivos (Inbox / IA / WhatsApp). */
export function contextualHintForArea(area: keyof typeof CONTEXTUAL_UPGRADE_HINTS): string {
  return CONTEXTUAL_UPGRADE_HINTS[area];
}
