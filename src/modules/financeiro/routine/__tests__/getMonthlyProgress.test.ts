import { describe, expect, it } from "vitest";
import { getMonthlyProgress } from "../getMonthlyProgress";
import type { FinanceiroMonthlyTask } from "../types";

const task = (id: string, completed: boolean): FinanceiroMonthlyTask => ({
  id,
  title: "t",
  completed,
  priority: 1,
  cta: { label: "x", href: "/" },
});

describe("getMonthlyProgress", () => {
  it("lista vazia → zeros", () => {
    expect(getMonthlyProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });

  it("percentual arredondado", () => {
    expect(getMonthlyProgress([task("a", true), task("b", true), task("c", false)])).toEqual({
      completed: 2,
      total: 3,
      percent: 67,
    });
  });

  it("100% quando todas concluídas", () => {
    expect(getMonthlyProgress([task("a", true), task("b", true)])).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
    });
  });
});
