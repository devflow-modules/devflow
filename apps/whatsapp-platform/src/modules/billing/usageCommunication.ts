/**
 * Copy e formatadores para comunicação clara de uso incluído vs expansão (UI).
 * Limites numéricos: `plans.ts`. Preços unitários de expansão: `planConfig.getUsageUnitPricesBrl`.
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";

/** Nomes alinhados à fatura Stripe (não alterar sem alinhar produto/financeiro). */
export const STRIPE_USAGE_LINE_LABELS = {
  extraConversations: "Conversas adicionais",
  extraAi: "Uso adicional de IA",
} as const;

/** Texto principal visível por plano (≈3 s de leitura). */
export function formatIncludedUsageSentence(plan: PlanKey): string {
  const def = PLANS[plan];
  const m = def.limits.messagesPerMonth;
  const ai = def.limits.aiCallsPerMonth;
  const parts: string[] = [];
  if (m != null) parts.push(`até ${m.toLocaleString("pt-BR")} conversas por mês`);
  if (ai != null) parts.push(`até ${ai.toLocaleString("pt-BR")} interações de IA por mês`);
  if (parts.length === 0) return "Inclui uso conforme o seu plano.";
  if (parts.length === 1) return `Inclui ${parts[0]}.`;
  return `Inclui ${parts[0]} e ${parts[1]}.`;
}

export const USAGE_AFTER_INCLUDED_EXPLAINER =
  "Depois disso, o uso adicional é cobrado automaticamente no fim do período de faturação.";

export const USAGE_NO_SERVICE_INTERRUPTION =
  "O atendimento não é interrompido por causa destes limites — continua a operar normalmente.";

export const USAGE_EXPANSION_FRAMING =
  "Se precisar de mais volume, o uso adicional permite expandir a sua operação sem travar o atendimento.";

export const USAGE_ANTI_SURPRISE_LINE =
  "Nunca interrompemos o seu atendimento por causa dos limites incluídos: quando ultrapassa o pacote do plano, regista-se o uso adicional e a fatura reflete isso de forma transparente.";

export function formatExpansionUnitPriceLines(prices: { message: number; aiResponse: number }): string[] {
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    `${STRIPE_USAGE_LINE_LABELS.extraConversations}: R$ ${fmt(prices.message)} cada`,
    `${STRIPE_USAGE_LINE_LABELS.extraAi}: R$ ${fmt(prices.aiResponse)} por interação`,
  ];
}

export function contextualInboxUsageHint(messagesLimit: number | null | undefined): string {
  if (messagesLimit != null && messagesLimit > 0) {
    return `O seu plano inclui até ${messagesLimit.toLocaleString("pt-BR")} conversas por mês. Se precisar de mais, o uso adicional está disponível — veja detalhes em Plano e faturação.`;
  }
  return "Veja limites incluídos e uso do período em Plano e faturação.";
}

export function contextualAiUsageHint(aiLimit: number | null | undefined): string {
  if (aiLimit != null && aiLimit > 0) {
    return `Inclui até ${aiLimit.toLocaleString("pt-BR")} interações de IA por mês no seu plano. Além disso, pode expandir com uso adicional — sem interrupção do serviço.`;
  }
  return "Consulte o consumo de IA e os limites do plano em Plano e faturação.";
}
