import { describe, it, expect } from "vitest";
import { normalizeOnboardingStep } from "../normalizeOnboardingStep";

describe("normalizeOnboardingStep", () => {
  it("mantém completed", () => {
    expect(normalizeOnboardingStep("completed", false, false)).toBe("completed");
    expect(normalizeOnboardingStep("completed", true, true)).toBe("completed");
  });

  it("usuário existente: vazio com receita e despesa no mês → completed", () => {
    expect(normalizeOnboardingStep("empty", true, true)).toBe("completed");
  });

  it("fluxo guiado: added_income + despesa no mês → added_expense (celebração)", () => {
    expect(normalizeOnboardingStep("added_income", true, true)).toBe("added_expense");
  });

  it("empty com só receita no mês → added_income", () => {
    expect(normalizeOnboardingStep("empty", true, false)).toBe("added_income");
  });

  it("added_expense com ambos permanece", () => {
    expect(normalizeOnboardingStep("added_expense", true, true)).toBe("added_expense");
  });
});
