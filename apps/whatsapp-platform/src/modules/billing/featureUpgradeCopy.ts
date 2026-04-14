/**
 * Copy de upgrade alinhada a `planPresentation` / matriz de capacidades.
 * Usada em API (message), hints na UI e FeatureUpgradePrompt.
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";
import type { FeatureKey } from "./featureGate";
import { CONTEXTUAL_UPGRADE_HINTS } from "./planPresentation";

export const FEATURE_UPGRADE_COPY: Record<
  FeatureKey,
  string | undefined
> = {
  QUEUES_TAGS:
    "Organize o atendimento com filas e responsáveis — disponível a partir do plano Pro.",
  AUTOMATION: "Automação de regras — incluída a partir do Starter.",
  ADVANCED_AUTOMATION:
    "Automação avançada (fluxos mais ricos, tempo decorrido, notificações) — disponível a partir do Pro.",
  PLAYBOOKS:
    "Fluxos e automação avançada — disponível a partir do Pro.",
  AI_RESPONSE: "Respostas com IA — incluídas conforme o seu plano.",
  ADVANCED_AI:
    "Modelos e motores avançados de IA — disponíveis no plano Scale.",
  WEBHOOKS_API: "API e integrações — disponíveis no plano Scale.",
  ADVANCED_REPORTS: "Relatórios avançados — disponíveis a partir do Pro.",
  MULTI_USER: "Vários utilizadores na mesma conta — a partir do plano Pro.",
  PRIORITY_SUPPORT: "Suporte prioritário — incluído no plano Scale.",
};

function planDisplayName(plan: PlanKey): string {
  return PLANS[plan].name;
}

/** Mensagem curta para corpo JSON 403. */
export function featureUpgradeShortMessage(feature: FeatureKey, requiredPlan: PlanKey): string {
  const base = FEATURE_UPGRADE_COPY[feature]?.trim();
  const target = planDisplayName(requiredPlan);
  if (base) return `${base} Faça upgrade para ${target}.`;
  return `Esta funcionalidade requer o plano ${target}.`;
}

/** Texto para hints preventivos (Inbox / IA / WhatsApp). */
export function contextualHintForArea(
  area: keyof typeof CONTEXTUAL_UPGRADE_HINTS
): string {
  return CONTEXTUAL_UPGRADE_HINTS[area];
}
