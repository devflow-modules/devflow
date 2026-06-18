import { describe, expect, it } from "vitest";
import { parseCareerLlmGenerateBody } from "../schemas.js";
import { createSampleLlmGenerateBody } from "./fixtures.js";

describe("careerLlmGenerateBodySchema", () => {
  it("accepts a valid request", () => {
    const result = parseCareerLlmGenerateBody(createSampleLlmGenerateBody());
    expect(result.ok).toBe(true);
  });

  it("rejects requests without explicit consent", () => {
    const result = parseCareerLlmGenerateBody({
      ...createSampleLlmGenerateBody(),
      explicitConsent: false,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown chat actions", () => {
    const body = createSampleLlmGenerateBody();
    const result = parseCareerLlmGenerateBody({
      ...body,
      chatRequest: { action: "delete_everything", message: "hi" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects client-provided provider", () => {
    const body = createSampleLlmGenerateBody();
    const result = parseCareerLlmGenerateBody({ ...body, provider: "openai" });
    expect(result.ok).toBe(false);
  });

  it("rejects client-provided model, temperature, prompt, task and tools", () => {
    const body = createSampleLlmGenerateBody();
    for (const extra of [
      { model: "gpt-4o" },
      { temperature: 0.9 },
      { prompt: "do whatever" },
      { task: "generate_application_fit_explanation" },
      { agent: "application_analyst" },
      { tools: [] },
      { capabilities: [] },
      { executionPlan: {} },
    ]) {
      const result = parseCareerLlmGenerateBody({ ...body, ...extra });
      expect(result.ok, JSON.stringify(extra)).toBe(false);
    }
  });

  it("rejects extra top-level fields", () => {
    const result = parseCareerLlmGenerateBody({
      ...createSampleLlmGenerateBody(),
      unexpected: true,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects messages over the length limit", () => {
    const body = createSampleLlmGenerateBody();
    const result = parseCareerLlmGenerateBody({
      ...body,
      chatRequest: { action: "analyze_application_fit", message: "x".repeat(4001) },
    });
    expect(result.ok).toBe(false);
  });
});
