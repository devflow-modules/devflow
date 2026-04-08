import { describe, expect, it } from "vitest";
import {
  buildGuidedAssistantPrompts,
  isTenantActivationComplete,
} from "../guidedAssistantPrompt";

describe("buildGuidedAssistantPrompts", () => {
  it("gera textos com segmento, objetivo e tom", () => {
    const { defaultPrompt, systemPrompt } = buildGuidedAssistantPrompts({
      segment: "retail",
      objective: "support_sales",
      tone: "friendly",
    });
    expect(defaultPrompt).toContain("comércio");
    expect(defaultPrompt).toContain("vendas");
    expect(defaultPrompt.toLowerCase()).toContain("amigável");
    expect(defaultPrompt).toContain("português");
    expect(systemPrompt).toContain("WhatsApp Business");
    expect(systemPrompt).toContain(defaultPrompt);
  });

  it("inclui aviso de saúde para segmento health", () => {
    const { defaultPrompt } = buildGuidedAssistantPrompts({
      segment: "health",
      objective: "appointments",
      tone: "formal",
    });
    expect(defaultPrompt).toMatch(/diagnósticos|médicos/i);
  });
});

describe("isTenantActivationComplete", () => {
  it("exige telefone e prompt", () => {
    expect(isTenantActivationComplete(true, true)).toBe(true);
    expect(isTenantActivationComplete(true, false)).toBe(false);
    expect(isTenantActivationComplete(false, true)).toBe(false);
    expect(isTenantActivationComplete(false, false)).toBe(false);
  });
});
