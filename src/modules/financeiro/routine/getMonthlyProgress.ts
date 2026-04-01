import type { FinanceiroMonthlyTask } from "./types";

export type MonthlyProgress = {
  completed: number;
  total: number;
  percent: number;
};

export function getMonthlyProgress(tasks: FinanceiroMonthlyTask[]): MonthlyProgress {
  const total = tasks.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = tasks.filter((t) => t.completed).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
