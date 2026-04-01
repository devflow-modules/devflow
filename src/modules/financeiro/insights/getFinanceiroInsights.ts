import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";
import type { FinanceiroInsight, FinanceiroInsightInput } from "./types";
import {
  currentMonthKey,
  daysSinceIsoDate,
  filterExpensesInMonth,
  filterIncomesInMonth,
  latestDateInMonthRecords,
  sumAmount,
} from "./monthMetrics";

const B = FINANCEIRO_BASE_PATH;

const MAX_INSIGHTS = 3;

/**
 * Motor simples de priorização (sem IA). Menor `priority` = mais urgente.
 */
export function getFinanceiroInsights(input: FinanceiroInsightInput): FinanceiroInsight[] {
  const now = input.now ?? new Date();
  const monthKey = currentMonthKey(now);
  const role = input.activeMembershipRole;

  const monthIncomes = filterIncomesInMonth(input.incomes, monthKey);
  const monthExpenses = filterExpensesInMonth(input.expenses, monthKey);
  const monthIncTotal = sumAmount(monthIncomes);
  const monthExpTotal = sumAmount(monthExpenses);

  const anyEver = input.incomes.length > 0 || input.expenses.length > 0;
  const latestInMonth = latestDateInMonthRecords(monthIncomes, monthExpenses);
  const staleDaysInMonth = latestInMonth ? daysSinceIsoDate(latestInMonth, now) : null;

  const candidates: FinanceiroInsight[] = [];

  if (!anyEver) {
    candidates.push({
      id: "primeiro_uso",
      type: "opportunity",
      priority: 1,
      title: "Comece pelo essencial",
      description:
        "Registre a primeira receita ou despesa para o painel mostrar saldo, categorias e projeções.",
      cta: { label: "Adicionar movimentação", href: `${B}/expenses#nova-despesa` },
    });
  } else {
    if (monthExpTotal === 0 && monthIncTotal === 0) {
      candidates.push({
        id: "mes_sem_movimentacao",
        type: "warning",
        priority: 2,
        title: "Nada registrado neste mês",
        description: "Atualize receitas e despesas do mês atual para acompanhar o caixa com precisão.",
        cta: { label: "Registrar agora", href: `${B}/expenses#nova-despesa` },
      });
    } else {
      if (monthExpTotal === 0 && monthIncTotal > 0) {
        candidates.push({
          id: "sem_despesas_mes",
          type: "warning",
          priority: 3,
          title: "Sem despesas neste mês",
          description: "Você já lançou receitas — inclua despesas para ver o saldo real do período.",
          cta: { label: "Adicionar despesa", href: `${B}/expenses#nova-despesa` },
        });
      }
      if (monthIncTotal === 0 && monthExpTotal > 0) {
        candidates.push({
          id: "sem_receitas_mes",
          type: "warning",
          priority: 3,
          title: "Sem receitas neste mês",
          description: "Há despesas registradas; adicione entradas para não subestimar o caixa.",
          cta: { label: "Adicionar receita", href: `${B}/expenses#nova-receita` },
        });
      }
    }

    const meaningfulCats = new Set(
      monthExpenses
        .map((e) => (e.category ?? "").trim())
        .filter((c) => c.length > 0 && c.toLowerCase() !== "outros")
    );
    if (monthExpenses.length > 0 && meaningfulCats.size === 0) {
      candidates.push({
        id: "categorias_fracas",
        type: "opportunity",
        priority: 5,
        title: "Diversifique categorias",
        description:
          "Suas despesas do mês estão só em “Outros” ou sem categoria — classificar ajuda a enxergar padrões.",
        cta: { label: "Nomear categorias", href: `${B}/expenses#categorias` },
      });
    }

    if (role === "OWNER" && input.rulesCount === 0 && (monthIncTotal > 0 || monthExpTotal > 0)) {
      candidates.push({
        id: "sem_regras",
        type: "opportunity",
        priority: 6,
        title: "Automatize com regras",
        description: "Crie regras de rateio por categoria ou valor fixo e reduza trabalho manual.",
        cta: { label: "Criar regra", href: `${B}/rules` },
      });
    }

    const series = input.summarySeries ?? [];
    if (series.length >= 2) {
      const prev = series[series.length - 2]?.expenses ?? 0;
      const last = series[series.length - 1]?.expenses ?? 0;
      if (prev > 0 && last > prev * 1.1) {
        const pct = Math.round(((last - prev) / prev) * 100);
        candidates.push({
          id: "gastos_acima_padrao",
          type: "warning",
          priority: 4,
          title: "Gastos acima do mês anterior",
          description: `As despesas do último mês na série subiram cerca de ${pct}% em relação ao anterior. Vale revisar categorias.`,
          cta: { label: "Ver lançamentos", href: `${B}/expenses` },
        });
      }
    }

    if (
      staleDaysInMonth != null &&
      staleDaysInMonth >= 14 &&
      (monthIncomes.length > 0 || monthExpenses.length > 0)
    ) {
      candidates.push({
        id: "dados_desatualizados",
        type: "info",
        priority: 7,
        title: "Atualize os lançamentos do mês",
        description: `O registro mais recente deste mês tem cerca de ${staleDaysInMonth} dias. Inclua o que faltar para fechar o período.`,
        cta: { label: "Atualizar lançamentos", href: `${B}/expenses` },
      });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, MAX_INSIGHTS);
}
