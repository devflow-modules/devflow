import { describe, expect, it } from "vitest";
import { getFinanceiroInsights } from "../getFinanceiroInsights";

const dec = (d: number) => `2025-12-${String(d).padStart(2, "0")}`;
const nov = (d: number) => `2025-11-${String(d).padStart(2, "0")}`;

describe("getFinanceiroInsights", () => {
  const now = new Date("2025-12-15T12:00:00Z");

  it("casa vazia → primeiro_uso", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("primeiro_uso");
    expect(r[0].cta.href).toContain("expenses#nova-despesa");
  });

  it("mês sem movimentação mas com histórico", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [{ amount: 100, receivedAt: nov(5) }],
      expenses: [{ amount: 50, dueDate: nov(6), category: "X" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r.some((i) => i.id === "mes_sem_movimentacao")).toBe(true);
  });

  it("receita no mês sem despesa → sem_despesas_mes", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [{ amount: 100, receivedAt: dec(5) }],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r.some((i) => i.id === "sem_despesas_mes")).toBe(true);
  });

  it("despesa no mês sem receita → sem_receitas_mes", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [],
      expenses: [{ amount: 40, dueDate: dec(5), category: "Aluguel" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r.some((i) => i.id === "sem_receitas_mes")).toBe(true);
  });

  it("OWNER sem regras com movimento no mês → sem_regras", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [{ amount: 100, receivedAt: dec(1) }],
      expenses: [{ amount: 20, dueDate: dec(2), category: "Mercado" }],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r.some((i) => i.id === "sem_regras")).toBe(true);
  });

  it("MEMBER não vê insight de regras", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [{ amount: 100, receivedAt: dec(1) }],
      expenses: [{ amount: 20, dueDate: dec(2), category: "Mercado" }],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    expect(r.some((i) => i.id === "sem_regras")).toBe(false);
  });

  it("retorna no máximo 3 insights", () => {
    const r = getFinanceiroInsights({
      now,
      incomes: [],
      expenses: [
        { amount: 10, dueDate: dec(1), category: "Outros" },
        { amount: 10, dueDate: dec(2), category: "outros" },
      ],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
      summarySeries: [
        { label: "nov", incomes: 0, expenses: 100, balance: 0 },
        { label: "dez", incomes: 0, expenses: 200, balance: 0 },
      ],
    });
    expect(r.length).toBeLessThanOrEqual(3);
  });
});
