import { CAREER_LLM_OUTPUT_LIMITS } from "../constants.js";
import type {
  CareerLlmItemPriority,
  CareerLlmProviderAdapter,
  CareerLlmProviderRequest,
  CareerLlmProviderResponse,
  CareerLlmStructuredItem,
  CareerLlmStructuredOutput,
  CareerLlmTask,
} from "../types.js";

const TASK_TITLES: Record<CareerLlmTask, string> = {
  generate_application_fit_explanation: "Application fit explanation (draft)",
  generate_profile_gap_explanation: "Profile gap explanation (draft)",
  generate_interview_preparation_content: "Interview preparation content (draft)",
  generate_resume_improvement_explanation: "Resume improvement explanation (draft)",
  generate_ats_compatibility_explanation: "ATS compatibility explanation (draft)",
  generate_career_strategy_explanation: "Career strategy explanation (draft)",
  generate_review_proposal_copy: "Review proposal copy (draft)",
};

function parsePriority(token: string): CareerLlmItemPriority {
  if (token === "high" || token === "medium" || token === "low") {
    return token;
  }
  return "medium";
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function parseLabeledItem(line: string): CareerLlmStructuredItem {
  const match = line.match(/^\[([^|\]]+)\|([^\]]+)\]\s*(.*)$/);
  if (match) {
    return {
      category: clamp(match[1].trim() || "general", CAREER_LLM_OUTPUT_LIMITS.titleMaxLength),
      text: clamp(match[3].trim() || match[1].trim(), CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength),
      priority: parsePriority(match[2].trim()),
      evidenceIds: [],
    };
  }

  return {
    category: "general",
    text: clamp(line.trim(), CAREER_LLM_OUTPUT_LIMITS.itemTextMaxLength),
    priority: "medium",
    evidenceIds: [],
  };
}

function buildDeterministicOutput(request: CareerLlmProviderRequest): CareerLlmStructuredOutput {
  const lines = request.envelope.contextSummary.split("\n");

  let summary = "";
  const findings: CareerLlmStructuredItem[] = [];
  const recommendations: CareerLlmStructuredItem[] = [];
  const evidenceReferences: string[] = [];

  for (const line of lines) {
    if (line.startsWith("SUMMARY: ")) {
      summary = clamp(line.slice("SUMMARY: ".length).trim(), CAREER_LLM_OUTPUT_LIMITS.summaryMaxLength);
    } else if (line.startsWith("FINDING: ")) {
      if (findings.length < CAREER_LLM_OUTPUT_LIMITS.maxFindings) {
        findings.push(parseLabeledItem(line.slice("FINDING: ".length)));
      }
    } else if (line.startsWith("RECOMMENDATION: ")) {
      if (recommendations.length < CAREER_LLM_OUTPUT_LIMITS.maxRecommendations) {
        recommendations.push(parseLabeledItem(line.slice("RECOMMENDATION: ".length)));
      }
    } else if (line.startsWith("EVIDENCE: ")) {
      if (evidenceReferences.length < CAREER_LLM_OUTPUT_LIMITS.maxEvidenceReferences) {
        evidenceReferences.push(clamp(line.slice("EVIDENCE: ".length).trim(), 120));
      }
    }
  }

  findings.forEach((finding, index) => {
    if (evidenceReferences[index]) {
      finding.evidenceIds = [evidenceReferences[index]];
    }
  });

  return {
    title: TASK_TITLES[request.task],
    summary: summary || "Deterministic draft generated from the reviewed agent analysis.",
    findings,
    recommendations,
    evidenceReferences,
    warnings: [],
  };
}

/**
 * Deterministic, network-free provider. The same provider request always yields the
 * same structured output. Used for CI, tests, cost-free smoke, and controlled fallback.
 */
export class MockCareerLlmProvider implements CareerLlmProviderAdapter {
  readonly provider = "mock" as const;

  generate(request: CareerLlmProviderRequest): Promise<CareerLlmProviderResponse> {
    const output = buildDeterministicOutput(request);
    return Promise.resolve({
      ok: true,
      externalCall: false,
      output,
      modelAlias: request.modelAlias,
      usage: { inputUnits: 0, outputUnits: 0 },
      durationMs: 0,
    });
  }
}

export function createMockCareerLlmProvider(): MockCareerLlmProvider {
  return new MockCareerLlmProvider();
}
