import type { InterviewPreparation } from "@devflow/career-core";
import type { CareerPrepRecord } from "@/lib/career-prep-storage";
import type { AtsAnalysisResult } from "./atsTypes";

/** Stable id for InterviewPreparation.applicationId (deterministic for same analysis inputs). */
export function stableAtsApplicationId(result: AtsAnalysisResult): string {
  const key = [
    result.practiceContext.resumeSummary,
    result.practiceContext.jobSummary,
    result.matchedKeywords.join("|"),
    result.missingKeywords.join("|"),
  ].join("::");
  let h = 5381;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 33) ^ key.charCodeAt(i)!;
  }
  const hex = (h >>> 0).toString(16);
  return `ats:${hex}`;
}

function padToMin(items: string[], min: number, fillers: readonly string[]): string[] {
  const out = [...items];
  let fi = 0;
  while (out.length < min) {
    out.push(fillers[fi % fillers.length]!);
    fi += 1;
  }
  return out;
}

/**
 * Maps ATS analysis into the existing {@link InterviewPreparation} shape (no changes to career-core).
 */
export function buildInterviewPreparationFromAtsAnalysis(result: AtsAnalysisResult): InterviewPreparation {
  const ctx = result.practiceContext;
  const id = stableAtsApplicationId(result);

  const focusSeed = [
    ...ctx.gapsToPrepare.slice(0, 4),
    ...ctx.strengthsToDefend.slice(0, 3),
    `Pitch (memorize a 20s version): ${ctx.suggestedPitch}`,
  ];
  const focusAreas = padToMin(focusSeed, 4, [
    "Re-read the job summary and list 5 must-have outcomes they care about.",
    "Prepare two STAR stories that map missing keywords to past work.",
  ]).slice(0, 6);

  const technicalQuestions = padToMin(result.likelyInterviewQuestions.slice(0, 8), 3, [
    "Pick one missing keyword and outline how you would ramp on it in 30 days.",
  ]).slice(0, 6);

  const behavioralSeed = [
    ...result.weakSignals.slice(0, 2).map((w) => `STAR: how you addressed: ${w}`),
    "STAR: influencing stakeholders when priorities shifted late in a cycle.",
    "STAR: a time you improved quality or reliability under delivery pressure.",
  ];
  const behavioralQuestions = padToMin(behavioralSeed, 3, [
    "STAR: a conflict you de-escalated while keeping delivery on track.",
  ]).slice(0, 6);

  const speakingSeed = [
    `Opening hook: ${ctx.suggestedPitch}`,
    `Clarify scope: reference job summary themes: ${summarize(ctx.jobSummary, 140)}`,
    `Evidence: cite strengths to defend: ${ctx.strengthsToDefend.slice(0, 2).join(" · ") || "your core strengths"}`,
  ];
  const speakingPrompts = padToMin(speakingSeed, 3, [
    "Closing: one sentence on how you reduce risk for the hiring team in the first 90 days.",
  ]).slice(0, 6);

  const liveSeed = [
    ...result.missingKeywords.slice(0, 3).map((k) => `Whiteboard plan: add ${k} to an existing system — interfaces first.`),
    "Live coding: narrate invariants before each mutation; test two edge cases aloud.",
  ];
  const liveCodingHints = padToMin(liveSeed, 3, [
    "Trace data flow on paper for one feature in your resume before writing code.",
  ]).slice(0, 6);

  const estimatedSessionMinutes = Math.min(45, Math.max(15, 14 + Math.floor(result.overallScore / 7)));

  return {
    applicationId: id,
    focusAreas,
    technicalQuestions,
    behavioralQuestions,
    speakingPrompts,
    liveCodingHints,
    estimatedSessionMinutes,
  };
}

function summarize(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function inferRoleTitle(jobSummary: string): string {
  const line = jobSummary.split(/[.!?]/)[0]?.trim() ?? jobSummary.trim();
  const clipped = line.slice(0, 120).trim();
  return clipped.length > 0 ? clipped : "Target role (from job description)";
}

/**
 * Builds a {@link CareerPrepRecord} compatible with {@link appendCareerPrepRecord} and the practice page.
 */
export function buildCareerPrepRecordFromAtsAnalysis(
  result: AtsAnalysisResult,
  prepRecordId: string,
  createdAtIso: string,
): CareerPrepRecord {
  const preparation = buildInterviewPreparationFromAtsAnalysis(result);
  return {
    id: prepRecordId,
    applicationId: preparation.applicationId,
    company: "ATS-style match",
    role: inferRoleTitle(result.practiceContext.jobSummary),
    status: "interview_scheduled",
    requiredSkills: [...result.matchedKeywords].sort((a, b) => a.localeCompare(b)),
    preparation,
    createdAt: createdAtIso,
    prepSource: "ats",
  };
}
