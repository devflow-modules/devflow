import { describe, expect, it } from "vitest";
import { getFinanceiroMonthlyTasks } from "../getFinanceiroMonthlyTasks";
const dec = (d: number) => `2025-12-${String(d).padStart(2, "0")}`;

describe("getFinanceiroMonthlyTasks", () => {
  const now = new Date("2025-12-15T12:00:00Z");

  it("OWNER retorna até 5 tarefas", () => {
    const tasks = getFinanceiroMonthlyTasks({
      now,
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "OWNER",
    });
    expect(tasks.length).toBeLessThanOrEqual(5);
    expect(tasks.map((t) => t.id)).toEqual(
      expect.arrayContaining(["task_income", "task_expense", "task_categories", "task_rules", "task_summary"])
    );
  });

  it("MEMBER não inclui tarefa de regras", () => {
    const tasks = getFinanceiroMonthlyTasks({
      now,
      incomes: [],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    expect(tasks.some((t) => t.id === "task_rules")).toBe(false);
    expect(tasks.length).toBeLessThanOrEqual(4);
  });

  it("pendentes aparecem antes de concluídas na lista", () => {
    const tasks = getFinanceiroMonthlyTasks({
      now,
      incomes: [{ amount: 100, receivedAt: dec(1) }],
      expenses: [],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].id).toBe("task_expense");
    const last = tasks[tasks.length - 1];
    expect(last.completed).toBe(true);
  });

  it("receita e despesa no mês marcam resumo como concluído", () => {
    const tasks = getFinanceiroMonthlyTasks({
      now,
      incomes: [{ amount: 1, receivedAt: dec(1) }],
      expenses: [{ amount: 1, dueDate: dec(2), category: "X" }],
      rulesCount: 0,
      activeMembershipRole: "MEMBER",
    });
    const summary = tasks.find((t) => t.id === "task_summary");
    expect(summary?.completed).toBe(true);
  });
});
