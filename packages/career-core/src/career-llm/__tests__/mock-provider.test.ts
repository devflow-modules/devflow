import { describe, expect, it } from "vitest";
import { createMockCareerLlmProvider } from "../providers/mock-provider.js";
import { validateCareerLlmStructuredOutput } from "../structured-output.js";
import type { CareerLlmProviderRequest } from "../types.js";

function sampleProviderRequest(): CareerLlmProviderRequest {
  return {
    task: "generate_application_fit_explanation",
    envelope: {
      task: "generate_application_fit_explanation",
      instructions: "Write a reviewable explanation.",
      contextSummary: [
        "AGENT: application_analyst",
        "INTENT: analyze_application_fit",
        "SUMMARY: Fit review completed for 2 applications.",
        "FINDING: [fit|high] Strong skill overlap on TypeScript.",
        "RECOMMENDATION: [next_steps|high] Prioritize the strongest match.",
        "EVIDENCE: signal-1:gmail:provider_email_activity",
        "USER_MESSAGE_DATA: Focus on backend reliability.",
      ].join("\n"),
      outputSchema: "schema",
      constraints: ["a"],
    },
    modelAlias: "career-mock-1",
    temperature: 0,
    maxOutputTokens: 1024,
    timeoutMs: 10000,
  };
}

describe("MockCareerLlmProvider", () => {
  it("produces valid structured output", async () => {
    const provider = createMockCareerLlmProvider();
    const response = await provider.generate(sampleProviderRequest());
    expect(response.ok).toBe(true);
    expect(response.externalCall).toBe(false);
    expect(validateCareerLlmStructuredOutput(response.output).ok).toBe(true);
  });

  it("is deterministic for the same input", async () => {
    const provider = createMockCareerLlmProvider();
    const first = await provider.generate(sampleProviderRequest());
    const second = await provider.generate(sampleProviderRequest());
    expect(JSON.stringify(first.output)).toBe(JSON.stringify(second.output));
  });

  it("never reports an external call", async () => {
    const provider = createMockCareerLlmProvider();
    const response = await provider.generate(sampleProviderRequest());
    expect(response.externalCall).toBe(false);
    expect(response.usage).toEqual({ inputUnits: 0, outputUnits: 0 });
  });

  it("derives findings and recommendations from the envelope", async () => {
    const provider = createMockCareerLlmProvider();
    const response = await provider.generate(sampleProviderRequest());
    const output = response.output as { findings: unknown[]; recommendations: unknown[] };
    expect(output.findings.length).toBeGreaterThan(0);
    expect(output.recommendations.length).toBeGreaterThan(0);
  });
});
