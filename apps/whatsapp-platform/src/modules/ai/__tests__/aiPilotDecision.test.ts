import { describe, it, expect, afterEach, vi } from "vitest";
import {
  evaluatePilotSafePreLlm,
  getAiMinConfidenceThreshold,
  isAiPilotSafeModeEnabled,
  resolveStructuredLlmDecision,
  mapDecisionReasonToHandoffReason,
} from "../aiPilotDecision";

describe("aiPilotDecision", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_AI_SAFE_MODE;
    delete process.env.WHATSAPP_AI_MIN_CONFIDENCE;
  });

  it("safe mode activo por defeito", () => {
    expect(isAiPilotSafeModeEnabled()).toBe(true);
  });

  it("safe mode desligável via env", () => {
    process.env.WHATSAPP_AI_SAFE_MODE = "0";
    expect(isAiPilotSafeModeEnabled()).toBe(false);
  });

  it("min confidence default 0.65", () => {
    expect(getAiMinConfidenceThreshold()).toBe(0.65);
  });

  it("evaluatePilotSafePreLlm força handoff em orçamento", () => {
    const d = evaluatePilotSafePreLlm({
      messageText: "Qual o orçamento mensal?",
      safeMode: true,
    });
    expect(d?.action).toBe("handoff");
    expect(d?.reason).toContain("pilot_safe_topic");
  });

  it("evaluatePilotSafePreLlm ignora quando safe mode off", () => {
    expect(
      evaluatePilotSafePreLlm({ messageText: "preço?", safeMode: false })
    ).toBeNull();
  });

  it("resolveStructuredLlmDecision: needs_human → handoff", () => {
    const d = resolveStructuredLlmDecision({
      needsHuman: true,
      reply: "ok",
      pilot: { safeMode: true, minConfidence: 0.65, fallbackToHuman: true },
    });
    expect(d.action).toBe("handoff");
    expect(d.reason).toBe("llm_needs_human");
  });

  it("resolveStructuredLlmDecision: baixa confiança → handoff em safe mode", () => {
    const d = resolveStructuredLlmDecision({
      reply: "Resposta",
      confidence: 0.2,
      intent: "informação",
      pilot: { safeMode: true, minConfidence: 0.65, fallbackToHuman: true },
    });
    expect(d.action).toBe("handoff");
    expect(d.reason).toBe("low_confidence");
  });

  it("resolveStructuredLlmDecision: intent suporte → handoff em safe mode", () => {
    const d = resolveStructuredLlmDecision({
      reply: "Vou ajudar",
      confidence: 0.9,
      intent: "suporte",
      pilot: { safeMode: true, minConfidence: 0.65, fallbackToHuman: true },
    });
    expect(d.action).toBe("handoff");
    expect(d.reason).toBe("sensitive_intent");
  });

  it("resolveStructuredLlmDecision: erro LLM → handoff", () => {
    const d = resolveStructuredLlmDecision({
      fallback: true,
      error: "Timeout",
      pilot: { safeMode: true, minConfidence: 0.65, fallbackToHuman: true },
    });
    expect(d.action).toBe("handoff");
    expect(d.reason).toBe("llm_error");
  });

  it("resolveStructuredLlmDecision: resposta segura → auto_reply", () => {
    const d = resolveStructuredLlmDecision({
      reply: "Horário: 9h–18h",
      confidence: 0.88,
      intent: "informação",
      pilot: { safeMode: true, minConfidence: 0.65, fallbackToHuman: true },
    });
    expect(d.action).toBe("auto_reply");
    if (d.action === "auto_reply") {
      expect(d.reply).toBe("Horário: 9h–18h");
    }
  });

  it("mapDecisionReasonToHandoffReason mapeia low_confidence", () => {
    expect(mapDecisionReasonToHandoffReason("low_confidence")).toBe("llm_low_confidence");
  });
});
