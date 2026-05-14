import type { AiResumeCoachingInput } from "./aiResumeCoachingTypes";

export const RESUME_COACHING_MAX_RESUME_CHARS = 10_000;
export const RESUME_COACHING_MAX_JOB_CHARS = 10_000;

export const AI_RESUME_COACHING_JSON_SCHEMA = `Return a single JSON object with keys:
professionalSummary (string, 2-4 sentences, English),
rewrittenBullets (array of { original, improved, reason } — align improved bullets to the job; do not invent employers, dates, or degrees not implied by the resume),
jobSpecificPitch (string, English, ~30-45 seconds when spoken aloud),
interviewTalkingPoints (array of strings, English, practical and specific),
weaknessDefenseStrategy (array of { gap, suggestedAnswer } — honest STAR-style defenses tied to real resume content),
resumeOptimizationChecklist (array of short actionable strings),
finalRecommendation (string, concise next-step advice in English).

Use the local ATS analysis as source of truth. Prefer specificity over buzzwords. Do not claim certifications or ATS scores the candidate does not have.`;

export function buildAiResumeCoachingSystemPrompt(): string {
  return [
    "You are a senior technical recruiter and pragmatic career coach.",
    "The candidate already ran a deterministic local ATS-style match in their browser — treat that structured analysis as factual input for this coaching pass.",
    "Improve clarity, specificity, and job alignment. Keep suggestions honest and interview-ready.",
    "Do not invent employers, products, metrics, or degrees not clearly supported by the resume text.",
    "Write all coaching fields in English (international job applications).",
    AI_RESUME_COACHING_JSON_SCHEMA,
    "Respond with JSON only — no markdown code fences around the object.",
  ].join(" ");
}

export function truncateForPrompt(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildAiResumeCoachingUserPrompt(input: AiResumeCoachingInput): string {
  const resume = truncateForPrompt(input.resumeText, RESUME_COACHING_MAX_RESUME_CHARS);
  const job = truncateForPrompt(input.jobDescriptionText, RESUME_COACHING_MAX_JOB_CHARS);
  const a = input.atsAnalysis;

  const atsBlock = {
    overallScore: a.overallScore,
    technicalScore: a.technicalScore,
    seniorityScore: a.seniorityScore,
    keywordCoverageScore: a.keywordCoverageScore,
    interviewReadinessScore: a.interviewReadinessScore,
    matchedKeywords: a.matchedKeywords,
    missingKeywords: a.missingKeywords,
    weakSignals: a.weakSignals,
    strengths: a.strengths,
    improvementSuggestions: a.improvementSuggestions,
    likelyInterviewQuestions: a.likelyInterviewQuestions.slice(0, 14),
    practiceContext: a.practiceContext,
  };

  return [
    "## Resume (verbatim excerpt)",
    "",
    resume,
    "",
    "## Job description (verbatim excerpt)",
    "",
    job,
    "",
    "## Local ATS-style analysis (JSON — source of truth for this coaching pass)",
    "",
    JSON.stringify(atsBlock, null, 2),
    "",
    "Generate the JSON coaching object per the system instructions. Ground every suggestion in the resume and ATS fields; use missing keywords and weak signals for gap coverage.",
  ].join("\n");
}

/** Deep clone for tests that assert prompts do not mutate caller-owned analysis objects. */
export function cloneCoachingInput(input: AiResumeCoachingInput): AiResumeCoachingInput {
  return {
    resumeText: input.resumeText,
    jobDescriptionText: input.jobDescriptionText,
    atsAnalysis: {
      ...input.atsAnalysis,
      matchedKeywords: [...input.atsAnalysis.matchedKeywords],
      missingKeywords: [...input.atsAnalysis.missingKeywords],
      weakSignals: [...input.atsAnalysis.weakSignals],
      strengths: [...input.atsAnalysis.strengths],
      improvementSuggestions: [...input.atsAnalysis.improvementSuggestions],
      rewrittenBullets: input.atsAnalysis.rewrittenBullets.map((b) => ({ ...b })),
      likelyInterviewQuestions: [...input.atsAnalysis.likelyInterviewQuestions],
      practiceContext: {
        ...input.atsAnalysis.practiceContext,
        strengthsToDefend: [...input.atsAnalysis.practiceContext.strengthsToDefend],
        gapsToPrepare: [...input.atsAnalysis.practiceContext.gapsToPrepare],
      },
    },
  };
}
