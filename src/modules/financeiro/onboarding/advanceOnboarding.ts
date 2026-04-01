import {
  notifyOnboardingChanged,
  readOnboardingStep,
  writeOnboardingStep,
} from "./storage";
import {
  trackFinanceiroOnboardingStepCompleted,
} from "@/lib/analytics";

/** Após criar receita (POST). */
export function advanceOnboardingAfterIncomeCreated(): void {
  const prev = readOnboardingStep();
  if (prev === "completed") return;
  if (prev === "empty") {
    writeOnboardingStep("added_income");
    trackFinanceiroOnboardingStepCompleted({ step: "income", surface: "expenses_page" });
    notifyOnboardingChanged();
  }
}

/** Após criar despesa (POST). */
export function advanceOnboardingAfterExpenseCreated(): void {
  const prev = readOnboardingStep();
  if (prev === "completed") return;
  if (prev === "added_income") {
    writeOnboardingStep("added_expense");
    trackFinanceiroOnboardingStepCompleted({ step: "expense", surface: "expenses_page" });
    notifyOnboardingChanged();
  }
}
