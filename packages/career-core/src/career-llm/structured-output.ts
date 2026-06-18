import { z } from "zod";
import { CAREER_LLM_OUTPUT_LIMITS } from "./constants.js";
import type { CareerLlmStructuredOutput } from "./types.js";

const structuredItemSchema = z
  .object({
    category: z.string().trim().min(1).max(CAREER_LLM_OUTPUT_LIMITS.titleMaxLength),
    text: z.string().trim().min(1).max(CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength),
    priority: z.enum(["high", "medium", "low"]),
    evidenceIds: z.array(z.string().trim().min(1)).max(CAREER_LLM_OUTPUT_LIMITS.maxEvidenceReferences),
  })
  .strict();

export const careerLlmStructuredOutputSchema = z
  .object({
    title: z.string().trim().min(1).max(CAREER_LLM_OUTPUT_LIMITS.titleMaxLength),
    summary: z.string().trim().min(1).max(CAREER_LLM_OUTPUT_LIMITS.summaryMaxLength),
    findings: z.array(structuredItemSchema).max(CAREER_LLM_OUTPUT_LIMITS.maxFindings),
    recommendations: z.array(structuredItemSchema).max(CAREER_LLM_OUTPUT_LIMITS.maxRecommendations),
    evidenceReferences: z
      .array(z.string().trim().min(1))
      .max(CAREER_LLM_OUTPUT_LIMITS.maxEvidenceReferences),
    warnings: z.array(z.string().trim().min(1)).max(CAREER_LLM_OUTPUT_LIMITS.maxFindings),
  })
  .strict();

export type ValidateCareerLlmStructuredOutputResult =
  | { ok: true; value: CareerLlmStructuredOutput }
  | { ok: false; code: "invalid_structured_output" | "output_limit_exceeded"; message: string };

function exceedsLimits(value: CareerLlmStructuredOutput): boolean {
  return (
    value.summary.length > CAREER_LLM_OUTPUT_LIMITS.summaryMaxLength ||
    value.findings.length > CAREER_LLM_OUTPUT_LIMITS.maxFindings ||
    value.recommendations.length > CAREER_LLM_OUTPUT_LIMITS.maxRecommendations ||
    value.evidenceReferences.length > CAREER_LLM_OUTPUT_LIMITS.maxEvidenceReferences ||
    value.findings.some((item) => item.text.length > CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength) ||
    value.recommendations.some((item) => item.text.length > CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength)
  );
}

export function validateCareerLlmStructuredOutput(
  value: unknown,
): ValidateCareerLlmStructuredOutputResult {
  const parsed = careerLlmStructuredOutputSchema.safeParse(value);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === "too_big");
    return {
      ok: false,
      code: tooLong ? "output_limit_exceeded" : "invalid_structured_output",
      message: tooLong
        ? "Structured output exceeded the allowed limits."
        : "Structured output did not match the required schema.",
    };
  }

  if (exceedsLimits(parsed.data)) {
    return {
      ok: false,
      code: "output_limit_exceeded",
      message: "Structured output exceeded the allowed limits.",
    };
  }

  return { ok: true, value: parsed.data };
}

/**
 * Strict JSON Schema for provider structured outputs (`type: "json_schema"`, `strict: true`).
 * Mirrors `CareerLlmStructuredOutput` exactly: every property is required and
 * `additionalProperties` is false, as required by strict mode. Length and item-count
 * limits are enforced server-side by {@link validateCareerLlmStructuredOutput}; strict
 * mode does not reliably support `maxLength`/`maxItems`, so they are intentionally omitted.
 */
export const CAREER_LLM_STRUCTURED_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "findings", "recommendations", "evidenceReferences", "warnings"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "text", "priority", "evidenceIds"],
        properties: {
          category: { type: "string" },
          text: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "text", "priority", "evidenceIds"],
        properties: {
          category: { type: "string" },
          text: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    evidenceReferences: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export const CAREER_LLM_STRUCTURED_OUTPUT_SCHEMA_NAME = "career_llm_structured_output";

export function describeCareerLlmOutputSchema(): string {
  return [
    "Return JSON only with this exact shape:",
    "{",
    '  "title": string (<=200 chars),',
    '  "summary": string (<=1000 chars),',
    '  "findings": Array<{ category, text(<=500), priority(high|medium|low), evidenceIds: string[] }> (<=10),',
    '  "recommendations": Array<{ category, text(<=500), priority, evidenceIds: string[] }> (<=10),',
    '  "evidenceReferences": string[] (<=20),',
    '  "warnings": string[]',
    "}",
  ].join("\n");
}
