"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  markOnboardingStartedLoggedThisSession,
  onboardingStartedLoggedThisSession,
  ONBOARDING_CHANGED_EVENT,
  readOnboardingStep,
  writeOnboardingStep,
} from "./storage";
import { normalizeOnboardingStep } from "./normalizeOnboardingStep";
import type { FinanceiroOnboardingStep } from "./types";
import {
  trackFinanceiroOnboardingCompleted,
  trackFinanceiroOnboardingStarted,
} from "@/lib/analytics";

export type OnboardingBannerVariant =
  | "initial"
  | "prompt_expense"
  | "prompt_income"
  | "celebration"
  | null;

function computeBannerVariant(
  step: FinanceiroOnboardingStep,
  hasIncomeMonth: boolean,
  hasExpenseMonth: boolean
): OnboardingBannerVariant {
  if (step === "completed") return null;
  if (step === "added_expense") return "celebration";
  if (step === "added_income" && !hasExpenseMonth) return "prompt_expense";
  if (step === "empty" && !hasIncomeMonth && !hasExpenseMonth) return "initial";
  if (step === "empty" && hasExpenseMonth && !hasIncomeMonth) return "prompt_income";
  if (step === "empty" && hasIncomeMonth && !hasExpenseMonth) return "prompt_expense";
  if (step === "added_income" && hasExpenseMonth) return "celebration";
  return null;
}

export function useFinanceiroOnboarding(
  hasIncomeMonth: boolean,
  hasExpenseMonth: boolean,
  isLoading: boolean,
  householdId: string | undefined
) {
  const [step, setStep] = useState<FinanceiroOnboardingStep>("empty");

  const hydrate = useCallback(() => {
    setStep(readOnboardingStep());
  }, []);

  useEffect(() => {
    hydrate();
  }, [householdId, hydrate]);

  useEffect(() => {
    const onChange = () => hydrate();
    window.addEventListener(ONBOARDING_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(ONBOARDING_CHANGED_EVENT, onChange);
  }, [hydrate]);

  useEffect(() => {
    if (isLoading || !householdId) return;
    const prev = readOnboardingStep();
    const next = normalizeOnboardingStep(prev, hasIncomeMonth, hasExpenseMonth);
    if (next !== prev) {
      writeOnboardingStep(next);
      setStep(next);
    }
  }, [isLoading, householdId, hasIncomeMonth, hasExpenseMonth]);

  useEffect(() => {
    if (isLoading || !householdId) return;
    const v = computeBannerVariant(step, hasIncomeMonth, hasExpenseMonth);
    if (v === "initial" && !onboardingStartedLoggedThisSession()) {
      markOnboardingStartedLoggedThisSession();
      trackFinanceiroOnboardingStarted({ surface: "dashboard" });
    }
  }, [isLoading, householdId, step, hasIncomeMonth, hasExpenseMonth]);

  const bannerVariant = useMemo(
    () => computeBannerVariant(step, hasIncomeMonth, hasExpenseMonth),
    [step, hasIncomeMonth, hasExpenseMonth]
  );

  const coachMarks = step === "added_expense";

  const dismissCelebration = useCallback(() => {
    writeOnboardingStep("completed");
    setStep("completed");
    trackFinanceiroOnboardingCompleted({ surface: "dashboard" });
  }, []);

  return {
    step,
    bannerVariant,
    coachMarks,
    dismissCelebration,
  };
}
