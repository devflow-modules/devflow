import { describe, expect, it } from "vitest";

import { canAutofillField, isBlockedAutofillDomType } from "./autofill-safety.js";

function base(): Parameters<typeof canAutofillField>[0] {
  return {
    label: "",
    classificationType: "years_experience",
    suggestionConfidence: "high",
    fieldConfidence: "high",
    suggestedValue: "5",
    requiresConfirmation: false,
  };
}

describe("canAutofillField", () => {
  it("permite high em sugestão e campo", () => {
    expect(canAutofillField(base())).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it("permite medium", () => {
    expect(
      canAutofillField({
        ...base(),
        suggestionConfidence: "medium",
        fieldConfidence: "medium",
      }),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it("bloqueia low na sugestão sem confirmação", () => {
    const g = canAutofillField({
      ...base(),
      suggestionConfidence: "low",
      requiresConfirmation: false,
    });
    expect(g.allowed).toBe(false);
    expect(g.requiresConfirmation).toBe(true);
    expect(g.reason).toContain("Confiança da sugestão");
  });

  it("permite low na sugestão com confirmação", () => {
    expect(
      canAutofillField({
        ...base(),
        suggestionConfidence: "low",
        requiresConfirmation: true,
      }),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it("bloqueia suggestedValue vazio", () => {
    const g = canAutofillField({ ...base(), suggestedValue: "   " });
    expect(g.allowed).toBe(false);
    expect(g.requiresConfirmation).toBe(false);
  });

  it("bloqueia unknown sem confirmação", () => {
    const g = canAutofillField({
      ...base(),
      classificationType: "unknown",
      suggestionConfidence: "high",
      requiresConfirmation: false,
    });
    expect(g.allowed).toBe(false);
    expect(g.requiresConfirmation).toBe(true);
  });

  it("permite unknown com confirmação", () => {
    expect(
      canAutofillField({
        ...base(),
        classificationType: "unknown:react",
        requiresConfirmation: true,
      }).allowed,
    ).toBe(true);
  });

  it("bloqueia fieldConfidence low sem confirmação mesmo com sugestão high", () => {
    const g = canAutofillField({
      ...base(),
      suggestionConfidence: "high",
      fieldConfidence: "low",
      requiresConfirmation: false,
    });
    expect(g.allowed).toBe(false);
    expect(g.requiresConfirmation).toBe(true);
    expect(g.reason).toContain("classificação do campo");
  });
});

describe("isBlockedAutofillDomType", () => {
  it("marca submit e button como bloqueados", () => {
    expect(isBlockedAutofillDomType("submit")).toBe(true);
    expect(isBlockedAutofillDomType("button")).toBe(true);
    expect(isBlockedAutofillDomType("number")).toBe(false);
  });
});
