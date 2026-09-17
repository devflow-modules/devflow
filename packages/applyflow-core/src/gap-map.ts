import { computeGapFrequency, computeGapOutcomeAssociation } from "./career-analytics.js";
import type { CareerAnalyticsInput } from "./career-analytics-types.js";

export const GAP_MAP_ACTIONS = ["study", "project", "production_experience", "candidate_input", "no_action"] as const;
export type GapMapAction = (typeof GAP_MAP_ACTIONS)[number];

export type GapMapEntry = {
  requirementKey: string;
  label: string;
  category: string;
  highPriorityFrequency: number;
  currentEvidence: "none" | "partial" | "proven" | "unknown";
  observedOutcomeAssociation?: number;
  suggestedAction: GapMapAction;
};

function suggestedAction(label: string, key: string, evidence: GapMapEntry["currentEvidence"]): GapMapAction {
  if (evidence === "proven") return "no_action";
  const text = `${label} ${key}`.toLowerCase();
  if (/\bc1\b|\bc2\b|\bcertified english\b/.test(text)) return "candidate_input";
  if (/\b\d+\+\s*years\b/.test(text) && (/\barchitect/.test(text) || key === "aws")) return "production_experience";
  if (/\bllm\b|\bgenai\b|\bai agents?\b/.test(text)) return "project";
  if (key === "aws" || /\baws\b/.test(text)) return /\bfundamental|exposure|basics?\b/.test(text) ? "study" : "project";
  if (evidence === "unknown") return "candidate_input";
  if (evidence === "none") return "project";
  return "study";
}

export function computeGapMap(input: CareerAnalyticsInput): GapMapEntry[] {
  const freq = computeGapFrequency(input);
  const assoc = new Map(computeGapOutcomeAssociation(input).map((item) => [item.requirementKey, item.difference]));
  return freq.map((item) => {
    const currentEvidence =
      item.gapCount > 0 && item.partialCount === 0 && item.unknownCount === 0
        ? "none"
        : item.partialCount > 0
          ? "partial"
          : item.unknownCount > 0 && item.gapCount === 0
            ? "unknown"
            : "none";
    return {
      requirementKey: item.requirementKey,
      label: item.label,
      category: item.category,
      highPriorityFrequency: item.highPriorityFrequency,
      currentEvidence,
      observedOutcomeAssociation: assoc.get(item.requirementKey),
      suggestedAction: suggestedAction(item.label, item.requirementKey, currentEvidence),
    };
  });
}
