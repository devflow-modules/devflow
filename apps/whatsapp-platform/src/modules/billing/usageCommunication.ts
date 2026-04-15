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
  if (m != null) parts.push(`até ${m.toLocaleString("pt-BR")} conversas incluídas por mês`);
  if (ai != null) parts.push(`até ${ai.toLocaleString("pt-BR")} interações de IA por mês`);
  if (parts.length === 0) return "Inclui uso conforme o seu plano.";
  if (parts.length === 1) return `Inclui ${parts[0]}.`;
  return `Inclui ${parts[0]} e ${parts[1]}.`;
}

export const USAGE_AFTER_INCLUDED_EXPLAINER =
  "Ao atingir o limite do plano, o uso continua normalmente e o adicional é cobrado automaticamente no fim do período de faturação.";

export const USAGE_NO_SERVICE_INTERRUPTION =
  "O atendimento não é interrompido por causa destes limites — continua a operar normalmente.";

export const USAGE_EXPANSION_FRAMING =
  "Quando precisa de mais volume, o uso adicional permite a expansão da operação sem travar o atendimento.";

/** Linha curta sob o bloco de consumo: reduz ansiedade sobre cobrança indevida. */
export const USAGE_EXPANSION_ONLY_IF_GROWTH =
  "O uso adicional só acontece se o seu atendimento crescer além do volume incluído.";

export const USAGE_ANTI_SURPRISE_LINE =
  "Não interrompemos o atendimento por causa dos limites incluídos: quando o volume vai além do pacote do plano, regista-se o uso adicional e a fatura mostra isso com transparência — sem surpresas.";

export function formatExpansionUnitPriceLines(prices: { message: number; aiResponse: number }): string[] {
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    `Conversas adicionais: R$ ${fmt(prices.message)}`,
    `Uso adicional de IA: R$ ${fmt(prices.aiResponse)}`,
  ];
}

export function contextualInboxUsageHint(
  messagesLimit: number | null | undefined,
  options?: { isFreePlan?: boolean }
): string {
  if (messagesLimit != null && messagesLimit > 0) {
    if (options?.isFreePlan) {
      return `A avaliação inclui até ${messagesLimit.toLocaleString("pt-BR")} conversas por mês. Ao atingir o limite, ative a operação contratada — veja Consumo e faturação.`;
    }
    return `O seu pacote inclui até ${messagesLimit.toLocaleString("pt-BR")} conversas por mês. Se precisar de mais, o uso adicional está disponível — veja detalhes em Consumo e faturação.`;
  }
  return "Veja limites incluídos e uso do período em Consumo e faturação.";
}

export function contextualAiUsageHint(
  aiLimit: number | null | undefined,
  options?: { isFreePlan?: boolean }
): string {
  if (aiLimit != null && aiLimit > 0) {
    if (options?.isFreePlan) {
      return `Inclui até ${aiLimit.toLocaleString("pt-BR")} interações de IA por mês na avaliação. Ao atingir o limite, ative a operação contratada para continuar.`;
    }
    return `Inclui até ${aiLimit.toLocaleString("pt-BR")} interações de IA por mês no seu plano. Além disso, pode expandir com uso adicional — sem interrupção do serviço.`;
  }
  return "Consulte o consumo de IA e os limites em Consumo e faturação.";
}

/** Blocos curtos para secção «plano gratuito» na UI de billing. */
export function freePlanUsageExplainerLines(plan: PlanKey): { title: string; bullets: string[] } {
  const def = PLANS[plan];
  const m = def.limits.messagesPerMonth;
  const ai = def.limits.aiCallsPerMonth;
  const bullets: string[] = [];
  if (m != null) {
    bullets.push(`Inclui até ${m.toLocaleString("pt-BR")} conversas por mês.`);
  }
  if (ai != null) {
    bullets.push(`Inclui até ${ai.toLocaleString("pt-BR")} interações de IA por mês.`);
  }
  bullets.push("Ao atingir esse limite, é preciso ativar a operação contratada para continuar — fale connosco ou use Consumo e faturação.");
  bullets.push("Não há cobrança adicional nem expansão automática no plano gratuito.");
  return {
    title: "Como funciona a avaliação",
    bullets,
  };
}

/** Uma linha para listas «depois do incluído» em planos pagos. */
export function paidPlanUsageAfterIncludedLine(): string {
  return `${USAGE_AFTER_INCLUDED_EXPLAINER} ${USAGE_NO_SERVICE_INTERRUPTION}`;
}
