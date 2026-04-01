import { describe, expect, it } from "vitest";
import { getFinanceiroHealthScore, getHealthScoreFactors } from "../getFinanceiroHealthScore";

const JAN_15 = new Date("2026-01-15T12:00:00");

describe("getFinanceiroHealthScore", () => {
  it("mês vazio como OWNER: score mínimo de categorias+frescor e nível crítico", () => {
    const r = getFinanceiroHealthScore({
      now: JAN_15,
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(r.score).toBe(30);
    expect(r.level).toBe("critical");
    expect(r.breakdown.find((b) => b.id === "score_categories")?.passed).toBe(true);
    expect(r.breakdown.find((b) => b.id === "score_rules")?.passed).toBe(false);
  });

  it("MEMBER ignora regras (critério sempre ok)", () => {
    const r = getFinanceiroHealthScore({
      now: JAN_15,
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    expect(r.breakdown.find((b) => b.id === "score_rules")?.passed).toBe(true);
    expect(r.score).toBe(45);
  });

  it("cenário completo no mês atual: 100 pontos", () => {
    const r = getFinanceiroHealthScore({
      now: JAN_15,
      incomes: [{ amount: 100, receivedAt: "2026-01-10" }],
      expenses: [{ amount: 40, dueDate: "2026-01-12", category: "Mercado" }],
      rulesCount: 1,
      activeMembershipRole: "OWNER",
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe("good");
  });

  it("despesas só em Outros: perde peso de categorias", () => {
    const r = getFinanceiroHealthScore({
      now: JAN_15,
      incomes: [{ amount: 50, receivedAt: "2026-01-05" }],
      expenses: [{ amount: 10, dueDate: "2026-01-06", category: "Outros" }],
      rulesCount: 1,
      activeMembershipRole: "OWNER",
    });
    expect(r.breakdown.find((b) => b.id === "score_categories")?.passed).toBe(false);
    expect(r.score).toBe(80);
  });

  it("lançamentos antigos no mês (≥14 dias): perde frescor", () => {
    const r = getFinanceiroHealthScore({
      now: JAN_15,
      incomes: [{ amount: 1, receivedAt: "2025-12-20" }],
      expenses: [{ amount: 1, dueDate: "2026-01-01", category: "X" }],
      rulesCount: 1,
      activeMembershipRole: "OWNER",
    });
    expect(r.breakdown.find((b) => b.id === "score_freshness")?.passed).toBe(false);
  });
});

describe("getHealthScoreFactors", () => {
  it("escolhe maior peso entre falhas e entre acertos", () => {
    const breakdown = [
      { id: "a", label: "", passed: false, weight: 20 },
      { id: "b", label: "", passed: false, weight: 10 },
      { id: "c", label: "", passed: true, weight: 15 },
      { id: "d", label: "", passed: true, weight: 10 },
    ];
    expect(getHealthScoreFactors(breakdown)).toEqual({
      lowest_factor: "a",
      highest_factor: "c",
    });
  });
});
