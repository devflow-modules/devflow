/**
 * Copy e formatadores para comunicação clara de uso incluído vs expansão (UI).
 * Limites numéricos: `plans.ts`. Preços unitários de expansão: `planConfig.getUsageUnitPricesBrl`.
 */

import type { PlanKey } from "./plans";
import { PLANS } from "./plans";
import { isWhiteLabelMode } from "@/lib/productMode";

/** Nomes alinhados à fatura Stripe (não alterar sem alinhar produto/financeiro). */
export const STRIPE_USAGE_LINE_LABELS = {
  extraConversations: "Conversas adicionais",
  extraAi: "Uso adicional de IA",
} as const;

/** Texto principal visível por plano (≈3 s de leitura). */
export function formatIncludedUsageSentence(plan: PlanKey): string {
  if (isWhiteLabelMode()) {
    return "Capacidade alinhada à configuração da operação com o suporte.";
  }
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

export const USAGE_AFTER_INCLUDED_EXPLAINER = isWhiteLabelMode()
  ? "Ao atingir a margem configurada, o suporte pode alinhar a capacidade da operação."
  : "Ao atingir o limite do plano, o uso continua normalmente e o adicional é cobrado automaticamente no fim do período de faturação.";

export const USAGE_NO_SERVICE_INTERRUPTION =
  "O atendimento não é interrompido por causa destes limites — continua a operar normalmente.";

export const USAGE_EXPANSION_FRAMING = isWhiteLabelMode()
  ? "Quando precisa de mais volume, o suporte ajuda a expandir a operação sem travar o atendimento."
  : "Quando precisa de mais volume, o uso adicional permite a expansão da operação sem travar o atendimento.";

/** Linha curta sob o bloco de consumo: reduz ansiedade sobre cobrança indevida. */
export const USAGE_EXPANSION_ONLY_IF_GROWTH = isWhiteLabelMode()
  ? "Ajustes de capacidade são tratados com o suporte quando a operação cresce."
  : "O uso adicional só acontece se o seu atendimento crescer além do volume incluído.";

export const USAGE_ANTI_SURPRISE_LINE = isWhiteLabelMode()
  ? "O atendimento continua a operar: para ajustar capacidade, contacte o suporte."
  : "Não interrompemos o atendimento por causa dos limites incluídos: quando o volume vai além do pacote do plano, regista-se o uso adicional e a fatura mostra isso com transparência — sem surpresas.";

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
  options?: { isFreePlan?: boolean; messagesUsed?: number }
): string {
  if (isWhiteLabelMode()) {
    return "Para ajustar a capacidade da operação, contacte o suporte.";
  }
  if (messagesLimit != null && messagesLimit > 0) {
    if (options?.isFreePlan) {
      const used = options.messagesUsed;
      const usedPart =
        typeof used === "number" && used >= 0
          ? ` Já utilizou ${used.toLocaleString("pt-BR")} de ${messagesLimit.toLocaleString("pt-BR")} mensagens da avaliação neste período.`
          : "";
      return `Ambiente de avaliação guiada: até ${messagesLimit.toLocaleString("pt-BR")} conversas incluídas por mês.${usedPart} Ao atingir o limite, a operação completa é ativada com a implantação — Consumo e faturação.`;
    }
    return `O seu pacote inclui até ${messagesLimit.toLocaleString("pt-BR")} conversas por mês. Se precisar de mais, o uso adicional está disponível — veja detalhes em Consumo e faturação.`;
  }
  return "Veja limites incluídos e uso do período em Consumo e faturação.";
}

export function contextualAiUsageHint(
  aiLimit: number | null | undefined,
  options?: { isFreePlan?: boolean; aiUsed?: number }
): string {
  if (isWhiteLabelMode()) {
    return "Para alinhar a capacidade de IA da operação, contacte o suporte.";
  }
  if (aiLimit != null && aiLimit > 0) {
    if (options?.isFreePlan) {
      const used = options.aiUsed;
      const usedPart =
        typeof used === "number" && used >= 0
          ? ` Utilização: ${used.toLocaleString("pt-BR")} de ${aiLimit.toLocaleString("pt-BR")} interações de IA na avaliação.`
          : "";
      return `Na avaliação guiada, inclui até ${aiLimit.toLocaleString("pt-BR")} interações de IA por mês.${usedPart} Acabou o incluído — avance para a operação completa com a equipa.`;
    }
    return `Inclui até ${aiLimit.toLocaleString("pt-BR")} interações de IA por mês no seu plano. Além disso, pode expandir com uso adicional — sem interrupção do serviço.`;
  }
  return "Consulte o consumo de IA e os limites em Consumo e faturação.";
}

/** Blocos curtos para secção de avaliação guiada (plano FREE) na UI de billing. */
export function freePlanUsageExplainerLines(plan: PlanKey): { title: string; bullets: string[] } {
  if (isWhiteLabelMode()) {
    return {
      title: "Ativação guiada",
      bullets: [
        "Inbox e canal WhatsApp para começar a operar.",
        "Automatizações avançadas, filas completas e integrações podem ser alinhadas com o suporte.",
        "Contacte o suporte para evoluir a operação quando precisar de mais capacidade.",
      ],
    };
  }
  const def = PLANS[plan];
  const m = def.limits.messagesPerMonth;
  const ai = def.limits.aiCallsPerMonth;
  const bullets: string[] = [];
  if (m != null) {
    bullets.push(`Até ${m.toLocaleString("pt-BR")} conversas incluídas por mês na demonstração.`);
  }
  if (ai != null) {
    bullets.push(`Até ${ai.toLocaleString("pt-BR")} interações de IA por mês na demonstração.`);
  }
  bullets.push(
    "Não é operação completa: automações avançadas, filas/tags completas, multiutilizador e integrações entram na implantação."
  );
  bullets.push(
    "Ao atingir o incluído, é preciso avançar para a operação completa — fale connosco ou use Consumo e faturação."
  );
  bullets.push("Sem cartão nesta fase e sem cobrança variável automática na avaliação.");
  return {
    title: "Como funciona a avaliação guiada",
    bullets,
  };
}

/** Uma linha para listas «depois do incluído» em planos pagos. */
export function paidPlanUsageAfterIncludedLine(): string {
  return `${USAGE_AFTER_INCLUDED_EXPLAINER} ${USAGE_NO_SERVICE_INTERRUPTION}`;
}
