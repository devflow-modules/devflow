import { describe, it, expect } from "vitest";
import { evaluateAutomationRules } from "../aiAutomationRules";

const baseConfig = {
  enabled: true,
  autoReply: true,
  model: "gpt-4o-mini",
  tone: "NEUTRAL",
  maxTokens: 200,
  temperature: 0.4,
  fallbackToHuman: true,
  rules: [],
  forbiddenTopics: [],
  handoffTriggers: [],
  assistantName: null,
  businessContext: "Negócio de teste",
  goal: null,
  outOfHoursReply: null,
  runtimeDriver: null,
  playbookJson: null,
} as const;

describe("evaluateAutomationRules", () => {
  it("mensagem curta em lead → shortCircuit", () => {
    const r = evaluateAutomationRules({
      messageText: "oi",
      aiState: "lead",
      config: baseConfig as never,
    });
    expect(r.shortCircuitReply).toBeTruthy();
    expect(r.promptAugmentation).toBeNull();
  });

  it("preço → augmentação comercial", () => {
    const r = evaluateAutomationRules({
      messageText: "qual o preço?",
      aiState: "negotiating",
      config: baseConfig as never,
    });
    expect(r.shortCircuitReply).toBeNull();
    expect(r.promptAugmentation).toContain("comercial");
  });

  it("handoffTriggers correspondentes → markNeedsHuman", () => {
    const r = evaluateAutomationRules({
      messageText: "quero falar com um atendente humano",
      aiState: "support",
      config: { ...baseConfig, handoffTriggers: ["atendente humano", "humano"] } as never,
    });
    expect(r.markNeedsHuman).toBe(true);
    expect(r.shortCircuitReply).toBeNull();
  });

  it("sem trigger → markNeedsHuman false", () => {
    const r = evaluateAutomationRules({
      messageText: "obrigado",
      aiState: "lead",
      config: { ...baseConfig, handoffTriggers: ["cancelar"] } as never,
    });
    expect(r.markNeedsHuman).toBe(false);
  });
});
