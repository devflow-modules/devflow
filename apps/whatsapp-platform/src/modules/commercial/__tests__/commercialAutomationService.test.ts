import { describe, it, expect } from "vitest";
import { detectRecoveryKeywords } from "../commercialAutomationService";
import { MAX_FOLLOWUP_RECOVERY_PER_THREAD } from "../commercialAutomationConstants";

describe("detectRecoveryKeywords", () => {
  it("detecta hesitação típica", () => {
    expect(detectRecoveryKeywords("vou pensar e te falo")).toBe(true);
    expect(detectRecoveryKeywords("depois vejo com calma")).toBe(true);
    expect(detectRecoveryKeywords("não sei se fecho")).toBe(true);
  });

  it("ignora mensagens neutras", () => {
    expect(detectRecoveryKeywords("quero fechar hoje")).toBe(false);
  });
});

describe("limites comerciais", () => {
  it("constante de máximo follow-up + recovery", () => {
    expect(MAX_FOLLOWUP_RECOVERY_PER_THREAD).toBe(2);
  });
});
