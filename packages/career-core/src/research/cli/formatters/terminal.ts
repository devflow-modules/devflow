import type { ModeratorAssistOutput, PilotCuratorResponse, PrepareSessionOutput } from "../../curator-contracts.js";
import { HUMAN_APPROVAL_BANNER, HUMAN_REVIEW_BANNER } from "../constants.js";
import { INTERNAL_PILOT_RUNBOOK_SOURCE } from "../../sources/internal-runbook.js";

export type OutputFormat = "terminal" | "json" | "markdown";

export function formatPrepareTerminal(output: PrepareSessionOutput): string {
  const lines = [
    "=== Career Pilot Curator — prepare ===",
    "",
    "Objective:",
    output.objective,
    "",
    "Opening script:",
    ...output.openingScript.map((line) => `  - ${line}`),
    "",
    "Preflight checklist:",
    ...output.preflightChecklist.map((item) => `  [ ] ${item}`),
    "",
    "Tasks:",
    ...output.tasks.map((task) => `  - ${task.id}: ${task.prompt}`),
    "",
    "Risks:",
    ...output.risks.map((risk) => `  - ${risk}`),
    "",
    "Success criteria:",
    ...output.successCriteria.map((item) => `  - ${item}`),
    "",
    "Severity model (P0–P3):",
    ...Object.entries(INTERNAL_PILOT_RUNBOOK_SOURCE.severityMatrix).flatMap(([level, items]) => [
      `  ${level}:`,
      ...items.map((item) => `    - ${item}`),
    ]),
    "",
    HUMAN_REVIEW_BANNER,
  ];
  return lines.join("\n");
}

export function formatPrepareMarkdown(output: PrepareSessionOutput): string {
  return [
    "# Career Pilot Curator — prepare",
    "",
    "## Objective",
    output.objective,
    "",
    "## Opening script",
    ...output.openingScript.map((line) => `- ${line}`),
    "",
    "## Preflight",
    ...output.preflightChecklist.map((item) => `- [ ] ${item}`),
    "",
    "## Tasks",
    ...output.tasks.map((task) => `- **${task.id}**: ${task.prompt}`),
    "",
    `> ${HUMAN_REVIEW_BANNER}`,
  ].join("\n");
}

export function formatAssistTerminal(output: ModeratorAssistOutput): string {
  return [
    "Guidance:",
    ...output.guidance.map((line) => `  - ${line}`),
    "",
    "Avoid:",
    ...output.avoid.map((line) => `  - ${line}`),
    "",
    `Intervention allowed: ${output.interventionAllowed ? "yes" : "no"}`,
    "",
    HUMAN_REVIEW_BANNER,
  ].join("\n");
}

export function formatSynthesisMarkdown(response: PilotCuratorResponse): string {
  const summary = response.summary;
  const decision = response.recommendation ?? "INSUFFICIENT EVIDENCE";
  const counts = summary?.findingsBySeverity ?? { P0: 0, P1: 0, P2: 0, P3: 0, insufficient_evidence: 0 };

  const completionLines =
    summary?.tasksCompleted.map(
      (task) => `- ${task.label}: ${task.completed ? "completed" : "not completed"}`,
    ) ?? [];

  return [
    `# ${summary?.sessionId ?? "Session"} — Pilot synthesis`,
    "",
    "## Decision recommendation",
    "",
    `\`${decision}\``,
    "",
    "## Completion",
    "",
    ...(completionLines.length ? completionLines : ["- Not provided"]),
    "",
    "## Findings",
    "",
    `- P0: ${counts.P0}`,
    `- P1: ${counts.P1}`,
    `- P2: ${counts.P2}`,
    `- P3: ${counts.P3}`,
    `- insufficient_evidence: ${counts.insufficient_evidence}`,
    "",
    "## Anonymized observations",
    "",
    ...(summary?.anonymizedObservations.length
      ? summary.anonymizedObservations.map((line) => `- ${line}`)
      : ["- None recorded"]),
    "",
    "## Limitations",
    "",
    ...(summary?.limitations.map((line) => `- ${line}`) ?? ["- None recorded"]),
    "",
    "## GitHub comment draft",
    "",
    "```markdown",
    response.githubCommentDraft ?? "",
    "```",
    "",
    `> ${HUMAN_APPROVAL_BANNER}`,
    "",
    `> Requires human approval before publishing.`,
  ].join("\n");
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function formatPrepare(
  output: PrepareSessionOutput,
  format: OutputFormat,
): string {
  if (format === "json") return formatJson({ ...output, requiresHumanReview: true });
  if (format === "markdown") return formatPrepareMarkdown(output);
  return formatPrepareTerminal(output);
}
