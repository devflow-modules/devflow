import { describe, expect, it } from "vitest";
import { CAREER_LLM_OUTPUT_LIMITS } from "../constants.js";
import { validateCareerLlmStructuredOutput } from "../structured-output.js";
import type { CareerLlmStructuredOutput } from "../types.js";

function validOutput(overrides: Partial<CareerLlmStructuredOutput> = {}): CareerLlmStructuredOutput {
  return {
    title: "Draft title",
    summary: "Draft summary derived from analysis.",
    findings: [{ category: "fit", text: "Strong skill overlap.", priority: "high", evidenceIds: ["e1"] }],
    recommendations: [
      { category: "next_steps", text: "Prioritize the strongest match.", priority: "high", evidenceIds: [] },
    ],
    evidenceReferences: ["e1"],
    warnings: [],
    ...overrides,
  };
}

describe("validateCareerLlmStructuredOutput", () => {
  it("accepts a valid structured output", () => {
    const result = validateCareerLlmStructuredOutput(validOutput());
    expect(result.ok).toBe(true);
  });

  it("rejects arbitrary html in text", () => {
    const result = validateCareerLlmStructuredOutput({ ...validOutput(), extra: "<script>" });
    expect(result.ok).toBe(false);
  });

  it("rejects summary over the limit", () => {
    const result = validateCareerLlmStructuredOutput(
      validOutput({ summary: "x".repeat(CAREER_LLM_OUTPUT_LIMITS.summaryMaxLength + 1) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("output_limit_exceeded");
    }
  });

  it("rejects too many findings", () => {
    const findings = Array.from({ length: CAREER_LLM_OUTPUT_LIMITS.maxFindings + 1 }, () => ({
      category: "fit",
      text: "Finding",
      priority: "low" as const,
      evidenceIds: [],
    }));
    const result = validateCareerLlmStructuredOutput(validOutput({ findings }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("output_limit_exceeded");
    }
  });

  it("rejects finding text over the limit", () => {
    const result = validateCareerLlmStructuredOutput(
      validOutput({
        findings: [
          {
            category: "fit",
            text: "x".repeat(CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength + 1),
            priority: "low",
            evidenceIds: [],
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects malformed objects", () => {
    expect(validateCareerLlmStructuredOutput(null).ok).toBe(false);
    expect(validateCareerLlmStructuredOutput("text").ok).toBe(false);
    expect(validateCareerLlmStructuredOutput({ title: "only" }).ok).toBe(false);
  });
});
