import type { AtsMatchOutput } from "@devflow/career-agents";

import { explainGapSeverityInputSchema, type ExplainGapSeverityInputParsed } from "../schemas.js";

export const TOOL_NAME = "explain_gap_severity" as const;

export type ExplainGapSeverityOutput = {
  summary: string;
  highPriority: string[];
  mediumPriority: string[];
  lowPriority: string[];
};

function formatGapLine(skill: string, reason: string): string {
  return `${skill}: ${reason}`;
}

export function handleExplainGapSeverity(input: ExplainGapSeverityInputParsed): ExplainGapSeverityOutput {
  const { match } = explainGapSeverityInputSchema.parse(input);
  const gaps = match.gapSeverity ?? [];

  const highPriority = gaps
    .filter((g) => g.severity === "high")
    .map((g) => formatGapLine(g.skill, g.reason))
    .sort((a, b) => a.localeCompare(b));

  const mediumPriority = gaps
    .filter((g) => g.severity === "medium")
    .map((g) => formatGapLine(g.skill, g.reason))
    .sort((a, b) => a.localeCompare(b));

  const lowPriority = gaps
    .filter((g) => g.severity === "low")
    .map((g) => formatGapLine(g.skill, g.reason))
    .sort((a, b) => a.localeCompare(b));

  const summary = buildSummary(match, highPriority.length, mediumPriority.length, lowPriority.length);

  return { summary, highPriority, mediumPriority, lowPriority };
}

function buildSummary(
  match: AtsMatchOutput,
  highCount: number,
  mediumCount: number,
  lowCount: number,
): string {
  const parts: string[] = [
    `Overall match score: ${match.score}/100.`,
  ];

  if (match.scoreBreakdown) {
    parts.push(
      `Required skills contribution: ${match.scoreBreakdown.requiredScore}/80.`,
      `Nice-to-have contribution: ${match.scoreBreakdown.niceToHaveScore}/20.`,
      `Evidence quality index: ${match.scoreBreakdown.evidenceScore}/100.`,
    );
  }

  if (highCount === 0 && mediumCount === 0 && lowCount === 0) {
    parts.push("No structured gap severity entries were recorded for this match.");
    return parts.join(" ");
  }

  parts.push(
    `Gap severity — high: ${highCount}, medium: ${mediumCount}, low: ${lowCount}.`,
    highCount > 0
      ? "Address high-priority gaps before applying or interviewing."
      : "No required-skill absences detected; review medium/low items for polish.",
  );

  return parts.join(" ");
}
