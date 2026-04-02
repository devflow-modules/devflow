import { describe, expect, it } from "vitest";
import { resolveFinanceiroUrgency } from "../resolveFinanceiroUrgency";
import type { FinanceiroMonthlyTask } from "@/modules/financeiro/routine/types";

const baseTasks = (partial: Partial<FinanceiroMonthlyTask>[] = []): FinanceiroMonthlyTask[] =>
  partial as FinanceiroMonthlyTask[];

describe("resolveFinanceiroUrgency", () => {
  const now = new Date("2026-03-15T12:00:00");

  it("sem dados → today_missing", () => {
    const u = resolveFinanceiroUrgency({
      now,
      incomes: [],
      expenses: [],
      tasks: baseTasks(),
    });
    expect(u?.kind).toBe("today_missing");
    expect(u?.ctaLabel).toBe("Adicionar movimentação");
  });

  it("último lançamento há 4 dias → stale", () => {
    const u = resolveFinanceiroUrgency({
      now,
      incomes: [{ receivedAt: "2026-03-11" }],
      expenses: [],
      tasks: baseTasks(),
    });
    expect(u?.kind).toBe("stale");
    expect(u?.message).toContain("desatualizado");
  });

  it("há dados mas nada hoje → today_missing", () => {
    const u = resolveFinanceiroUrgency({
      now,
      incomes: [{ receivedAt: "2026-03-14" }],
      expenses: [{ dueDate: "2026-03-14" }],
      tasks: baseTasks(),
    });
    expect(u?.kind).toBe("today_missing");
  });

  it("lançou hoje e há pendentes no checklist → incomplete", () => {
    const tasks: FinanceiroMonthlyTask[] = [
      {
        id: "task_rules",
        title: "Regra",
        completed: false,
        priority: 1,
        cta: { label: "Ir", href: "/ferramentas/financeiro/rules" },
      },
    ];
    const u = resolveFinanceiroUrgency({
      now,
      incomes: [{ receivedAt: "2026-03-15" }],
      expenses: [{ dueDate: "2026-03-15" }],
      tasks,
    });
    expect(u?.kind).toBe("incomplete");
    expect(u?.pendingCount).toBe(1);
    expect(u?.message).toContain("Faltam");
  });

  it("lançou hoje e checklist ok → null", () => {
    const u = resolveFinanceiroUrgency({
      now,
      incomes: [{ receivedAt: "2026-03-15" }],
      expenses: [{ dueDate: "2026-03-15" }],
      tasks: [
        {
          id: "task_income",
          title: "ok",
          completed: true,
          priority: 1,
          cta: { label: "a", href: "/ferramentas/financeiro/expenses" },
        },
      ],
    });
    expect(u).toBeNull();
  });
});
