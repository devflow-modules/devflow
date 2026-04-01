import type { FinanceiroOnboardingStep } from "./types";

export const FINANCEIRO_ONBOARDING_STEP_KEY = "financeiro_onboarding_step";

const SESSION_STARTED_KEY = "financeiro_onboarding_started_session";

export function readOnboardingStep(): FinanceiroOnboardingStep {
  if (typeof window === "undefined") return "empty";
  const raw = localStorage.getItem(FINANCEIRO_ONBOARDING_STEP_KEY);
  if (raw === "added_income" || raw === "added_expense" || raw === "completed") return raw;
  return "empty";
}

export function writeOnboardingStep(step: FinanceiroOnboardingStep): void {
  localStorage.setItem(FINANCEIRO_ONBOARDING_STEP_KEY, step);
}

export function onboardingStartedLoggedThisSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SESSION_STARTED_KEY) === "1";
}

export function markOnboardingStartedLoggedThisSession(): void {
  sessionStorage.setItem(SESSION_STARTED_KEY, "1");
}

export const ONBOARDING_CHANGED_EVENT = "financeiro-onboarding-changed";

export function notifyOnboardingChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_CHANGED_EVENT));
}
