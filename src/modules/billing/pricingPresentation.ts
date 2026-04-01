import type { PlanId } from "@/modules/billing/plans";
import { Plans } from "@/modules/billing/plans";

/** Frase curta para cartão de preço — narrativa comercial */
export function planTagline(planId: PlanId): string {
  switch (planId) {
    case "FREE":
      return "Validar o produto e organizar uma casa sem cartão.";
    case "PRO":
      return "Operação real: várias casas, regras e exportação.";
    case "TEAM":
      return "Famílias e pequenas equipes com escala e prioridade.";
    default:
      return "";
  }
}

/** Para quem é — ajuda na conversa de vendas */
export function planAudience(planId: PlanId): string {
  switch (planId) {
    case "FREE":
      return "Quem está começando ou fechando uma demo rápida.";
    case "PRO":
      return "Quem separa PJ/PF e quer previsibilidade no mês.";
    case "TEAM":
      return "Quem gerencia várias casas ou precisa de mais colaboração.";
    default:
      return "";
  }
}

/** Label do botão principal — sem ambiguidade */
export function planPrimaryCtaLabel(planId: PlanId): string {
  switch (planId) {
    case "FREE":
      return "Começar no Financeiro grátis";
    case "PRO":
      return "Assinar PRO no Stripe";
    case "TEAM":
      return "Assinar TEAM no Stripe";
    default:
      return "Continuar";
  }
}

/** Ordem de destaque na hierarquia visual (maior = mais ênfase) */
export function planCommercialRank(planId: PlanId): number {
  switch (planId) {
    case "PRO":
      return 3;
    case "TEAM":
      return 2;
    case "FREE":
      return 1;
    default:
      return 0;
  }
}

export function formatPlanLimitsSummary(planId: PlanId): string {
  const p = Plans[planId];
  const homes = p.maxHouseholds === 1 ? "1 casa" : `até ${p.maxHouseholds} casas`;
  return `${homes} · até ${p.maxRules} regras`;
}
