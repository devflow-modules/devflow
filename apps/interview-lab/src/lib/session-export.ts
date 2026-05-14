import type { ProblemDefinition, SessionRecord, TestOutcome } from "@/lib/types";
import { CHECKLIST_ITEMS } from "@/lib/types";
import { GUIDED_SCRIPT_USAGE_EXPORT } from "@/lib/interview-script";
import { formatNoSilenceModeLabel } from "@/lib/no-silence";
import { formatDuration } from "@/lib/format-time";

const NOT_PROVIDED = "Not provided.";
const NOT_TRACKED = "Not tracked";

export function formatKeyboardRescueUsed(value: boolean | null | undefined): "Yes" | "No" | typeof NOT_TRACKED {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return NOT_TRACKED;
}

function disp(v: unknown): string {
  if (v === undefined || v === null) return NOT_PROVIDED;
  if (typeof v === "string" && v.trim() === "") return NOT_PROVIDED;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export type ChatGptExportArgs = {
  session: SessionRecord;
  problem: ProblemDefinition | null;
};

/**
 * Markdown para colar no ChatGPT (revisão técnica / inglês / comportamento).
 * Não inclui dados fora da sessão e do problema local.
 */
export function buildChatGptSessionExport(args: ChatGptExportArgs): string {
  const { session, problem } = args;
  const lines: string[] = [];

  lines.push("# DevFlow Interview Lab — Session Review");
  lines.push("");
  lines.push("## Problem");
  lines.push(`- **Title:** ${problem?.title ?? NOT_PROVIDED}`);
  lines.push(`- **Difficulty:** ${problem?.difficulty ?? NOT_PROVIDED}`);
  lines.push(`- **Pattern:** ${problem?.pattern ?? NOT_PROVIDED}`);
  lines.push("");
  lines.push("## Prompt");
  lines.push(problem?.prompt ?? NOT_PROVIDED);
  lines.push("");
  lines.push("## Examples");
  if (problem?.examples?.length) {
    for (const ex of problem.examples) {
      lines.push(`- **Input:** ${ex.input}`);
      lines.push(`  **Output:** ${ex.output}`);
      if (ex.explanation) lines.push(`  **Note:** ${ex.explanation}`);
    }
  } else {
    lines.push(NOT_PROVIDED);
  }
  lines.push("");
  lines.push("## Session metrics");
  lines.push(`- **Elapsed time:** ${formatDuration(session.elapsedTimeSec)}`);
  lines.push(`- **Tests passed:** ${session.passedTests} / ${session.totalTests}`);
  lines.push(
    `- **No Silence mode:** ${session.noSilenceMode != null ? formatNoSilenceModeLabel(session.noSilenceMode) : NOT_TRACKED}`,
  );
  lines.push(
    `- **Nudges shown:** ${session.nudgeCount != null ? String(session.nudgeCount) : NOT_TRACKED}`,
  );
  lines.push(
    `- **Manual speak resets:** ${session.manualSpeakResetCount != null ? String(session.manualSpeakResetCount) : NOT_TRACKED}`,
  );
  lines.push("");

  const failed = getFailedOutcomes(session);
  lines.push("## Failed tests");
  if (failed.length === 0) {
    if (session.passedTests < session.totalTests && session.totalTests > 0) {
      lines.push(
        "Some tests failed, but per-case expected/received was not stored (older session or tests not run in this build).",
      );
    } else {
      lines.push("No failed tests in this session.");
    }
  } else {
    for (const t of failed) {
      lines.push(`### ${t.id}`);
      lines.push(`- **Expected:** ${t.expected !== undefined ? disp(t.expected) : NOT_PROVIDED}`);
      lines.push(`- **Received:** ${t.received !== undefined ? disp(t.received) : NOT_PROVIDED}`);
      if (t.detail) lines.push(`- **Detail:** ${t.detail}`);
      lines.push("");
    }
  }

  lines.push("## Interview checklist");
  for (const item of CHECKLIST_ITEMS) {
    const ok = session.checklist[item.id];
    lines.push(`- [${ok ? "x" : " "}] ${item.label}`);
  }
  lines.push("");

  lines.push("## Confidence");
  lines.push(
    `- **Before:** ${session.confidenceBefore != null ? String(session.confidenceBefore) + " / 5" : NOT_PROVIDED}`,
  );
  lines.push(
    `- **After:** ${session.confidenceAfter != null ? String(session.confidenceAfter) + " / 5" : NOT_PROVIDED}`,
  );
  lines.push("");

  lines.push("## Where you froze");
  lines.push(
    session.freezeReasons?.length ? session.freezeReasons.map((r) => `- ${r}`).join("\n") : NOT_PROVIDED,
  );
  lines.push("");

  lines.push("## Notes");
  lines.push(session.notes?.trim() ? session.notes.trim() : NOT_PROVIDED);
  lines.push("");
  lines.push("## Keyboard rescue");
  lines.push(`Used: ${formatKeyboardRescueUsed(session.keyboardRescueUsed)}`);
  lines.push(`Notes: ${session.keyboardIssueNotes?.trim() ? session.keyboardIssueNotes.trim() : NOT_PROVIDED}`);
  lines.push("");

  lines.push("## Guided script usage");
  lines.push(GUIDED_SCRIPT_USAGE_EXPORT);
  lines.push("");

  lines.push("## What I said in English");
  lines.push(session.spokenEnglishNotes?.trim() ? session.spokenEnglishNotes.trim() : NOT_PROVIDED);
  lines.push("");
  lines.push("## Where I need help");
  lines.push("");
  lines.push("");

  lines.push("## Your code");
  lines.push("```js");
  lines.push(session.code.trim() ? session.code : "// " + NOT_PROVIDED);
  lines.push("```");
  lines.push("");

  lines.push("## Ideal approach (reference)");
  lines.push(problem?.idealApproach ?? NOT_PROVIDED);
  lines.push("");
  lines.push("## Complexity (reference)");
  lines.push(problem?.complexity ?? NOT_PROVIDED);

  return lines.join("\n");
}

function getFailedOutcomes(session: SessionRecord): TestOutcome[] {
  const raw = session.testOutcomes;
  if (!raw?.length) return [];
  return raw.filter((o) => !o.pass);
}

export type FailedTestsExportArgs = {
  session: SessionRecord;
  /** Título do problema para contexto. */
  problemTitle: string;
};

/** Texto focado em falhas + código (para debug no ChatGPT). */
export function buildFailedTestsExport(args: FailedTestsExportArgs): string {
  const { session, problemTitle } = args;
  const failed = getFailedOutcomes(session);

  if (failed.length === 0) {
    if (session.passedTests >= session.totalTests && session.totalTests > 0) {
      return "No failed tests in this session.";
    }
    const lines: string[] = [
      `# ${problemTitle}`,
      "",
      "Per-test failure details were not stored for this session (e.g. older app version or tests not run).",
      `Summary: **${session.passedTests} / ${session.totalTests}** tests passed.`,
      "",
      "## Your code",
      "```js",
      session.code.trim() ? session.code : "// " + NOT_PROVIDED,
      "```",
      "",
      "Help me debug this solution.",
    ];
    return lines.join("\n");
  }

  const lines: string[] = [`# ${problemTitle}`, "", "## Failed tests", ""];

  for (const t of failed) {
    lines.push(`### ${t.id}`);
    lines.push(`- **Expected:** ${t.expected !== undefined ? disp(t.expected) : NOT_PROVIDED}`);
    lines.push(`- **Received:** ${t.received !== undefined ? disp(t.received) : NOT_PROVIDED}`);
    if (t.detail) lines.push(`- **Detail:** ${t.detail}`);
    lines.push("");
  }

  lines.push("## Your code");
  lines.push("```js");
  lines.push(session.code.trim() ? session.code : "// " + NOT_PROVIDED);
  lines.push("```");
  lines.push("");
  lines.push("Help me debug this solution.");

  return lines.join("\n");
}

/** Template em inglês para treinar narração (não depende da sessão). */
export function buildExplanationTemplate(): string {
  return [
    "Let me restate the problem to make sure I understand it correctly.",
    "",
    "The input is...",
    "The expected output is...",
    "",
    "My approach is...",
    "I chose this approach because...",
    "",
    "Now I will implement it step by step.",
    "",
    "To test it, I will use...",
    "The time complexity is...",
    "The space complexity is...",
  ].join("\n");
}
