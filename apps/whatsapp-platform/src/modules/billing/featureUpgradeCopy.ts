/**
 * Copy de gating alinhada à venda consultiva (sem «menu de planos»).
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";
import type { FeatureKey } from "./featureGate";
import { CONTEXTUAL_UPGRADE_HINTS } from "./planPresentation";

/** Mensagem quando FREE atinge limite (API 402 ou paywall contextual). */
export const FREE_PLAN_LIMIT_PAYWALL_MESSAGE =
  "Atingiu o limite da avaliação guiada. A operação completa (inbox, equipa, automações e volumes) é liberada na implantação — veja Consumo e faturação ou fale connosco.";

export const FEATURE_UPGRADE_COPY: Record<FeatureKey, string | undefined> = {
  QUEUES_TAGS:
    "Filas e tags completas fazem parte da operação completa — não estão na avaliação guiada. Fale connosco para incluir na implantação.",
  AUTOMATION:
    "Automação de regras integra a operação completa após implantação — na avaliação só experimenta o essencial da inbox.",
  ADVANCED_AUTOMATION:
    "Fluxos e automação avançada — disponíveis na operação completa; combinamos no contrato de implantação.",
  PLAYBOOKS: "Playbooks e fluxos avançados — alinhados na operação completa com a equipa.",
  AI_RESPONSE: "Respostas com IA além do incluído na avaliação — alinhadas ao pacote operacional contratado.",
  ADVANCED_AI: "Motores de IA avançados — quando previstos na operação completa.",
  WEBHOOKS_API: "API e integrações — quando fazem parte da implantação acordada.",
  ADVANCED_REPORTS: "Relatórios avançados — incluídos na operação completa.",
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
