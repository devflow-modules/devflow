import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";
import { getHealthScoreCriterionHref } from "@/modules/financeiro/health/criterionHrefs";
import type { FinanceiroHealthScoreResult } from "@/modules/financeiro/health/types";

const B = FINANCEIRO_BASE_PATH;

const LABELS: Record<string, string> = {
  score_income: "Registrar receita",
  score_expense: "Registrar despesa",
  score_categories: "Ajustar categorias",
  score_rules: "Criar regra de rateio",
  score_consistency: "Completar receitas e despesas",
  score_freshness: "Atualizar lançamentos",
};

/**
 * CTA principal do score: maior peso ainda em falha; se 100%, leva ao resumo/relatórios.
 */
export function getScorePrimaryCta(
  result: FinanceiroHealthScoreResult,
  isOwner: boolean
): { href: string; label: string } {
  const failed = result.breakdown.filter((b) => !b.passed).sort((a, b) => b.weight - a.weight);
  if (failed.length === 0) {
    return { href: `${B}/dashboard#relatorios`, label: "Ver relatórios" };
  }
  const top = failed[0];
  return {
    href: getHealthScoreCriterionHref(top.id, { isOwner }),
    label: LABELS[top.id] ?? "Melhorar agora",
  };
}
