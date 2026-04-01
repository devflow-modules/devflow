import { describe, expect, it } from "vitest";
import { getFinanceiroHealthScore } from "@/modules/financeiro/health/getFinanceiroHealthScore";
import { getFinanceiroInsights } from "@/modules/financeiro/insights/getFinanceiroInsights";
import { getFinanceiroMonthlyTasks } from "@/modules/financeiro/routine/getFinanceiroMonthlyTasks";

const dec = (d: number) => `2026-01-${String(d).padStart(2, "0")}`;
const nov = (d: number) => `2025-11-${String(d).padStart(2, "0")}`;

/** Mesma data para os três motores — evita drift de “mês atual”. */
const NOW = new Date("2026-01-15T12:00:00");

function engines(input: {
  incomes: { amount: number; receivedAt?: string | null }[];
  expenses: { amount: number; dueDate?: string | null; category?: string | null }[];
  rulesCount: number;
  activeMembershipRole: "OWNER" | "MEMBER" | null;
  summarySeries?: { label: string; incomes: number; expenses: number; balance: number }[];
}) {
  const base = { now: NOW, ...input };
  return {
    score: getFinanceiroHealthScore(base),
    tasks: getFinanceiroMonthlyTasks(base),
    insights: getFinanceiroInsights(base),
  };
}

describe("consistência entre score, checklist e insights", () => {
  it("mês com receita e despesa: consistência do score alinha task_summary concluída", () => {
    const { score, tasks } = engines({
      incomes: [{ amount: 10, receivedAt: dec(1) }],
      expenses: [{ amount: 5, dueDate: dec(2), category: "Mercado" }],
      rulesCount: 1,
      activeMembershipRole: "OWNER",
    });
    const summary = tasks.find((t) => t.id === "task_summary");
    const consistency = score.breakdown.find((b) => b.id === "score_consistency");
    expect(summary?.completed).toBe(true);
    expect(consistency?.passed).toBe(true);
  });

  it("sem receita no mês: score, task_income e insights apontam lacuna", () => {
    const { score, tasks, insights } = engines({
      incomes: [],
      expenses: [{ amount: 5, dueDate: dec(2), category: "X" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(score.breakdown.find((b) => b.id === "score_income")?.passed).toBe(false);
    expect(tasks.find((t) => t.id === "task_income")?.completed).toBe(false);
    expect(insights.some((i) => i.id === "sem_receitas_mes")).toBe(true);
  });

  it("OWNER sem regras com movimento: insight sem_regras e score_rules falham juntos", () => {
    const { score, insights } = engines({
      incomes: [{ amount: 10, receivedAt: dec(1) }],
      expenses: [{ amount: 2, dueDate: dec(2), category: "Mercado" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(insights.some((i) => i.id === "sem_regras")).toBe(true);
    expect(score.breakdown.find((b) => b.id === "score_rules")?.passed).toBe(false);
  });

  it("MEMBER: sem insight sem_regras e score_rules considerado ok", () => {
    const { score, insights } = engines({
      incomes: [{ amount: 10, receivedAt: dec(1) }],
      expenses: [{ amount: 2, dueDate: dec(2), category: "Mercado" }],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    expect(insights.some((i) => i.id === "sem_regras")).toBe(false);
    expect(score.breakdown.find((b) => b.id === "score_rules")?.passed).toBe(true);
  });

  it("só Outros: categorias_fracas + task_categories + score_categories alinhados", () => {
    const { score, tasks, insights } = engines({
      incomes: [{ amount: 10, receivedAt: dec(1) }],
      expenses: [
        { amount: 5, dueDate: dec(2), category: "Outros" },
        { amount: 3, dueDate: dec(3), category: "outros" },
      ],
      rulesCount: 1,
      activeMembershipRole: "OWNER",
    });
    expect(insights.some((i) => i.id === "categorias_fracas")).toBe(true);
    expect(tasks.find((t) => t.id === "task_categories")?.completed).toBe(false);
    expect(score.breakdown.find((b) => b.id === "score_categories")?.passed).toBe(false);
  });

  it("histórico fora do mês atual: mes_sem_movimentacao coexiste com score baixo no mês", () => {
    const { score, insights } = engines({
      incomes: [{ amount: 100, receivedAt: nov(5) }],
      expenses: [{ amount: 50, dueDate: nov(6), category: "X" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(insights.some((i) => i.id === "mes_sem_movimentacao")).toBe(true);
    expect(score.breakdown.find((b) => b.id === "score_income")?.passed).toBe(false);
    expect(score.breakdown.find((b) => b.id === "score_expense")?.passed).toBe(false);
  });
});
