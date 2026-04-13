import { describe, it, expect } from "vitest";
import {
  buildAgentSystemPrompt,
  hasEffectiveAgentPrompt,
  hasStructuredBehavior,
} from "../agentSystemPrompt";

describe("buildAgentSystemPrompt", () => {
  it("sem campos estruturados usa tom + rodapé mínimo", () => {
    const s = buildAgentSystemPrompt({
      tone: "NEUTRAL",
      rules: [],
      forbiddenTopics: [],
      handoffTriggers: [],
    });
    expect(s).toContain("Tom: neutro");
    expect(s).toContain("WhatsApp");
  });

  it("monta blocos quando há comportamento estruturado", () => {
    const s = buildAgentSystemPrompt({
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

  it("hasEffectiveAgentPrompt com regras", () => {
    expect(
      hasEffectiveAgentPrompt({
        tone: "NEUTRAL",
        rules: ["x"],
        forbiddenTopics: [],
        handoffTriggers: [],
      })
    ).toBe(true);
  });

  it("hasStructuredBehavior com nome do assistente", () => {
    expect(
      hasStructuredBehavior({
        tone: "NEUTRAL",
        assistantName: "x",
        rules: [],
        forbiddenTopics: [],
        handoffTriggers: [],
      })
    ).toBe(true);
  });
});
