import type { FinanceiroOnboardingStep } from "./types";

/**
 * Alinha o passo persistido com os dados do mês atual.
 * - Já tem receita + despesa no mês e passo vazio → concluído (usuário existente).
 * - `added_income` e já há despesa no mês → celebração (`added_expense`).
 */
export function normalizeOnboardingStep(
  step: FinanceiroOnboardingStep,
  hasIncomeMonth: boolean,
  hasExpenseMonth: boolean
): FinanceiroOnboardingStep {
  if (step === "completed") return "completed";

  if (hasIncomeMonth && hasExpenseMonth) {
    if (step === "empty") return "completed";
    if (step === "added_income") return "added_expense";
    return step;
  }

  if (step === "empty" && hasIncomeMonth && !hasExpenseMonth) return "added_income";

  return step;
}
