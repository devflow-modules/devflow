import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";

const B = FINANCEIRO_BASE_PATH;

/** Destino sugerido ao tocar num critério do breakdown (alinha ao checklist). */
export function getHealthScoreCriterionHref(
  criterionId: string,
  opts: { isOwner: boolean }
): string {
  switch (criterionId) {
    case "score_income":
      return `${B}/expenses#nova-receita`;
    case "score_expense":
      return `${B}/expenses#nova-despesa`;
    case "score_categories":
      return `${B}/expenses#categorias`;
    case "score_rules":
      return opts.isOwner ? `${B}/rules` : `${B}/dashboard#resumo-mes`;
    case "score_consistency":
      return `${B}/dashboard#resumo-mes`;
    case "score_freshness":
      return `${B}/expenses`;
    default:
      return `${B}/dashboard`;
  }
}
