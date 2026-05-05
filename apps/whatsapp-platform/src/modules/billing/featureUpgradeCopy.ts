/**
 * Copy de gating alinhada à venda consultiva (sem «menu de planos»).
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";
import type { FeatureKey } from "./featureGate";
import { CONTEXTUAL_UPGRADE_HINTS } from "./planPresentation";
import { isWhiteLabelMode } from "@/lib/productMode";

const FEATURE_UPGRADE_COPY_SAAS: Record<FeatureKey, string | undefined> = {
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

const FEATURE_UPGRADE_COPY_WHITE_LABEL: Record<FeatureKey, string | undefined> = {
  QUEUES_TAGS: "Filas e tags completas podem ser alinhadas na operação — contacte o suporte.",
  AUTOMATION: "Automação de regras pode ser expandida na operação — contacte o suporte.",
  ADVANCED_AUTOMATION: "Fluxos e automação avançada — disponíveis conforme a configuração da operação com o suporte.",
  PLAYBOOKS: "Playbooks e fluxos avançados — alinhados com o suporte.",
  AI_RESPONSE: "Respostas com IA além da margem atual — alinhadas à operação com o suporte.",
  ADVANCED_AI: "Motores de IA avançados — quando previstos na operação.",
  WEBHOOKS_API: "API e integrações — quando fazem parte da operação acordada.",
  ADVANCED_REPORTS: "Relatórios avançados — incluídos quando previstos na operação.",
  MULTI_USER: "Vários utilizadores na mesma conta — conforme a operação.",
  PRIORITY_SUPPORT: "Suporte prioritário — quando incluído na operação.",
};

export const FEATURE_UPGRADE_COPY: Record<FeatureKey, string | undefined> = isWhiteLabelMode()
  ? FEATURE_UPGRADE_COPY_WHITE_LABEL
  : FEATURE_UPGRADE_COPY_SAAS;

/** Mensagem quando FREE atinge limite (API 402 ou paywall contextual). */
export const FREE_PLAN_LIMIT_PAYWALL_MESSAGE = isWhiteLabelMode()
  ? "Atingiu a margem atual da operação neste período. Contacte o suporte para alinhar capacidade e continuar o atendimento."
  : "Atingiu o limite da avaliação guiada. A operação completa (inbox, equipa, automações e volumes) é liberada na implantação — veja Contrato e uso ou fale connosco.";

function planDisplayName(plan: PlanKey): string {
  return PLANS[plan].name;
}

/** Mensagem curta para corpo JSON 403. */
export function featureUpgradeShortMessage(feature: FeatureKey, requiredPlan: PlanKey): string {
  if (isWhiteLabelMode()) {
    const base = FEATURE_UPGRADE_COPY[feature]?.trim();
    if (base) return `${base} Contacte o suporte para mais informações.`;
    return "Esta funcionalidade não está disponível na configuração atual. Contacte o suporte.";
  }
  const base = FEATURE_UPGRADE_COPY[feature]?.trim();
  const target = planDisplayName(requiredPlan);
  if (base) return `${base} Capacidade necessária: ${target}.`;
  return `Esta funcionalidade requer a operação em modalidade: ${target}.`;
}

/** Texto para hints preventivos (Inbox / IA / WhatsApp). */
export function contextualHintForArea(area: keyof typeof CONTEXTUAL_UPGRADE_HINTS): string {
  return CONTEXTUAL_UPGRADE_HINTS[area];
}
