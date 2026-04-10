import { describe, it, expect } from "vitest";
import {
  buildAgentSystemPrompt,
  hasEffectiveAgentPrompt,
  hasStructuredBehavior,
} from "../agentSystemPrompt";

describe("buildAgentSystemPrompt", () => {
  it("usa prompt legado quando não há campos estruturados", () => {
    const s = buildAgentSystemPrompt({
      legacySystemPrompt: "Apenas legado.",
      tone: "NEUTRAL",
      rules: [],
      forbiddenTopics: [],
      handoffTriggers: [],
    });
    expect(s).toContain("Apenas legado.");
  });

  it("monta blocos quando há comportamento estruturado", () => {
    const s = buildAgentSystemPrompt({
      legacySystemPrompt: "",
      tone: "SALES",
      assistantName: "Ana",
      businessContext: "Vendemos software.",
      goal: "Agendar demo.",
      rules: ["Ser breve"],
      forbiddenTopics: ["Política"],
      handoffTriggers: ["Pedir humano"],
    });
    expect(s).toContain("Ana");
    expect(s).toContain("Vendemos software.");
    expect(s).toContain("Agendar demo.");
    expect(s).toContain("Ser breve");
    expect(s).toContain("Política");
    expect(s).toContain("Pedir humano");
  });

  it("hasEffectiveAgentPrompt com legado vazio mas regras", () => {
    expect(
      hasEffectiveAgentPrompt({
        legacySystemPrompt: "  ",
        tone: "NEUTRAL",
        rules: ["x"],
        forbiddenTopics: [],
        handoffTriggers: [],
      })
    ).toBe(true);
  });

  it("hasStructuredBehavior", () => {
    expect(
      hasStructuredBehavior({
        legacySystemPrompt: "",
        tone: "NEUTRAL",
        assistantName: "x",
        rules: [],
        forbiddenTopics: [],
        handoffTriggers: [],
      })
    ).toBe(true);
  });
});
