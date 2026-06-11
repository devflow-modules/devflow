import type { CareerApplication } from "@devflow/career-core";
import {
  analyzeJob,
  analyzeResume,
  matchJobToResume,
  type AtsMatchOutput,
  type JobAnalysisInput,
  type JobAnalysisOutput,
  type ResumeAnalysisInput,
  type ResumeAnalysisOutput,
} from "@devflow/career-agents";

import type { AtsAnalysisResult, AtsRewrittenBullet } from "./ats/atsTypes";

export type CareerAgentsPipelineResult = {
  jobInput: JobAnalysisInput;
  resumeInput: ResumeAnalysisInput;
  jobAnalysis: JobAnalysisOutput;
  resumeAnalysis: ResumeAnalysisOutput;
  match: AtsMatchOutput;
};

const SECTION_HEADER =
  /^(summary|experience|work experience|employment|practices|skills|technical skills|projects|project highlights|education)\s*:?\s*$/i;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function seniorityTierFromJob(s: JobAnalysisOutput["seniority"]): number {
  switch (s) {
    case "intern":
      return 1;
    case "junior":
      return 2;
    case "mid":
      return 3;
    case "senior":
      return 4;
    case "lead":
      return 5;
    default:
      return 3;
  }
}

function seniorityTierFromResume(resume: ResumeAnalysisOutput): number {
  const signals = resume.senioritySignals.join(" ").toLowerCase();
  if (/\b(lead|staff|principal|architect)\b/.test(signals)) return 5;
  if (/\b(s[eê]nior|senior)\b/.test(signals)) return 4;
  if (/\b(pleno|mid)\b/.test(signals)) return 3;
  if (/\b(j[uú]nior|junior|intern|est[aá]gio)\b/.test(signals)) return 2;
  return 3;
}

function extractResumeBulletLines(resume: string): string[] {
  const lines = resume.split(/\r?\n/).map((l) => l.trim());
  const bullets: string[] = [];
  const bulletRe = /^([-*•]|\d+[\).])\s*(.+)$/;
  for (const line of lines) {
    if (!line) continue;
    const m = line.match(bulletRe);
    if (m?.[2]) bullets.push(m[2].trim());
  }
  if (bullets.length === 0) {
    const sentence = resume.replace(/\s+/g, " ").trim();
    if (sentence.length >= 20) bullets.push(sentence.slice(0, 220));
  }
  return bullets.slice(0, 8);
}

function buildRewrittenBullets(bullets: string[], missingTech: string[]): AtsRewrittenBullet[] {
  const verbs = ["Delivered", "Shipped", "Owned", "Led", "Improved", "Scaled", "Automated", "Hardened"];
  const out: AtsRewrittenBullet[] = [];
  let vi = 0;
  for (const original of bullets.slice(0, 6)) {
    const trimmed = original.trim();
    if (!trimmed) continue;
    const miss =
      missingTech.length > 0
        ? missingTech[vi % missingTech.length]!
        : "keywords and outcomes highlighted in the job description";
    const verb = verbs[vi % verbs.length]!;
    const improved = `${verb} ${trimmed.replace(/^[.]+/, "")} — tie outcomes to ${miss} with metrics.`;
    out.push({ original: trimmed, improved });
    vi += 1;
  }
  return out;
}

function buildLikelyQuestions(
  match: AtsMatchOutput,
  job: JobAnalysisOutput,
  resume: ResumeAnalysisOutput,
): string[] {
  const qs: string[] = [...job.interviewTopics];
  for (const m of match.missingSkills.slice(0, 5)) {
    qs.push(`How have you used ${m} in production, and what trade-offs did you accept?`);
  }
  for (const s of resume.strongestEvidence.slice(0, 3)) {
    qs.push(`You highlight related experience — walk through: ${s.slice(0, 120)}`);
  }
  for (const w of resume.weakEvidence.slice(0, 2)) {
    qs.push(`Given ${w.toLowerCase()}, how would you close that gap before the onsite?`);
  }
  for (const flag of job.riskFlags.slice(0, 2)) {
    qs.push(`The posting flags "${flag}" — how would you address that in your answers?`);
  }
  qs.push("What questions do you have about our stack and delivery cadence?");
  return [...new Set(qs)].sort((a, b) => a.localeCompare(b)).slice(0, 14);
}

function summarize(text: string, maxLen: number): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= maxLen) return one;
  return `${one.slice(0, maxLen - 1).trim()}…`;
}

function parseExperiences(lines: string[]): NonNullable<ResumeAnalysisInput["experiences"]> {
  const exps: NonNullable<ResumeAnalysisInput["experiences"]> = [];
  let current: { title: string; company?: string; description?: string } | null = null;
  const bulletRe = /^([-*•]|\d+[\).])\s*(.+)$/;

  for (const line of lines) {
    const bullet = line.match(bulletRe);
    if (bullet) {
      if (!current) {
        current = { title: "Experience", description: bullet[2] };
      } else {
        current.description = [current.description, bullet[2]].filter(Boolean).join("\n");
      }
      continue;
    }

    const titleCo = line.match(/^(.+?)\s[@—–\-|]\s*(.+)$/);
    if (titleCo && titleCo[1].length < 80) {
      if (current) exps.push(current);
      current = { title: titleCo[1].trim(), company: titleCo[2].trim() };
      continue;
    }

    if (current) {
      current.description = [current.description, line].filter(Boolean).join("\n");
    } else {
      current = { title: line.slice(0, 80), description: "" };
    }
  }
  if (current) exps.push(current);
  return exps;
}

function parseSkills(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    for (const part of line.split(/[,;|•]/)) {
      const s = part.trim();
      if (s) skills.push(s);
    }
  }
  return skills;
}

function parseProjects(lines: string[]): NonNullable<ResumeAnalysisInput["projects"]> {
  const projects: NonNullable<ResumeAnalysisInput["projects"]> = [];
  let current: { name: string; description?: string; stack?: string[] } | null = null;

  for (const line of lines) {
    const bullet = line.match(/^([-*•]|\d+[\).])\s*(.+)$/);
    if (bullet) {
      const content = bullet[2].trim();
      if (!current) {
        current = { name: content.slice(0, 80), description: content };
      } else {
        current.description = [current.description, content].filter(Boolean).join("\n");
      }
      continue;
    }

    if (!current) {
      current = { name: line.slice(0, 80), description: line };
    } else {
      current.description = [current.description, line].filter(Boolean).join("\n");
    }
  }
  if (current) projects.push(current);
  return projects;
}

/** Map plain-text resume paste to {@link ResumeAnalysisInput}. */
export function plainTextToResumeInput(resumeText: string): ResumeAnalysisInput {
  const text = resumeText.trim();
  if (!text) return {};

  const lines = text.split(/\r?\n/);
  let headline: string | undefined;
  const sections: Record<string, string[]> = {};
  let currentSection = "body";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch = line.match(SECTION_HEADER);
    if (headerMatch) {
      currentSection = headerMatch[1].toLowerCase().replace(/\s+/g, "_");
      continue;
    }

    if (!headline && currentSection === "body") {
      headline = line;
      continue;
    }

    (sections[currentSection] ??= []).push(line);
  }

  const experienceLines = [
    ...(sections.body ?? []),
    ...(sections.experience ?? []),
    ...(sections.employment ?? []),
    ...(sections.work_experience ?? []),
    ...(sections.practices ?? []),
  ];
  const skillsLines = [...(sections.skills ?? []), ...(sections.technical_skills ?? [])];

  return {
    headline,
    summary: (sections.summary ?? []).join("\n") || undefined,
    experiences: experienceLines.length > 0 ? parseExperiences(experienceLines) : undefined,
    skills: skillsLines.length > 0 ? parseSkills(skillsLines) : undefined,
    projects: (sections.projects ?? sections.project_highlights ?? []).length
      ? parseProjects(sections.projects ?? sections.project_highlights ?? [])
      : undefined,
    education: (sections.education ?? []).length ? sections.education : undefined,
  };
}

/** Map plain-text job posting to {@link JobAnalysisInput}. */
export function plainTextToJobInput(jobText: string): JobAnalysisInput {
  const description = jobText.trim();
  const firstLine = description.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "Unknown role";
  const title = firstLine.replace(/^#+\s*/, "").slice(0, 160);
  return { title, description };
}

/** Map ApplyFlow {@link CareerApplication} into job analysis input (CareerBundle contract). */
export function careerApplicationToJobInput(app: CareerApplication): JobAnalysisInput {
  const skillsBlock =
    app.requiredSkills.length > 0
      ? `\n\nRequired skills:\n${app.requiredSkills.map((s) => `- ${s}`).join("\n")}\n`
      : "";
  return {
    title: app.role,
    company: app.company,
    description: `${app.jobDescription ?? ""}`.trim() + skillsBlock,
  };
}

/** Optional resume hints from bundle candidate metadata. */
export function careerApplicationToResumeInput(app: CareerApplication): ResumeAnalysisInput {
  return {
    headline: app.role,
    skills: [...app.requiredSkills],
    summary: app.notes?.trim() || undefined,
  };
}

/** Run deterministic career-agents pipeline on pasted text. */
export function runCareerAgentsPipeline(
  resumeText: string,
  jobDescriptionText: string,
): CareerAgentsPipelineResult {
  const resumeInput = plainTextToResumeInput(resumeText);
  const jobInput = plainTextToJobInput(jobDescriptionText);
  const jobAnalysis = analyzeJob(jobInput);
  const resumeAnalysis = analyzeResume(resumeInput);
  const match = matchJobToResume(jobAnalysis, resumeAnalysis);

  return { jobInput, resumeInput, jobAnalysis, resumeAnalysis, match };
}

/** Map career-agents outputs to legacy {@link AtsAnalysisResult} for Interview Lab UI. */
export function mapCareerAgentsToAtsResult(
  pipeline: CareerAgentsPipelineResult,
  resumeText: string,
): AtsAnalysisResult {
  const { jobAnalysis, resumeAnalysis, match } = pipeline;
  const breakdown = match.scoreBreakdown ?? {
    requiredScore: match.score,
    niceToHaveScore: 0,
    evidenceScore: 0,
  };

  const technicalScore =
    jobAnalysis.requiredSkills.length === 0
      ? 68
      : clampScore(Math.round((breakdown.requiredScore / 80) * 100));

  const keywordCoverageScore =
    jobAnalysis.niceToHaveSkills.length === 0
      ? clampScore(breakdown.evidenceScore)
      : clampScore(Math.round((breakdown.niceToHaveScore / 20) * 100));

  const seniorityScore = clampScore(
    100 - 26 * Math.min(3, Math.abs(seniorityTierFromJob(jobAnalysis.seniority) - seniorityTierFromResume(resumeAnalysis))),
  );

  const interviewReadinessScore = clampScore(match.score * 0.55 + breakdown.evidenceScore * 0.45);

  const overallScore = clampScore(match.score);

  const matchedKeywords = [...match.matchedSkills].sort((a, b) => a.localeCompare(b));
  const missingKeywords = [...match.missingSkills].sort((a, b) => a.localeCompare(b));

  const weakSignals = [
    ...resumeAnalysis.weakEvidence,
    ...match.evidenceGaps.slice(0, 4),
    ...jobAnalysis.riskFlags.map((f) => `Job risk signal: ${f}`),
  ].sort((a, b) => a.localeCompare(b));

  const strengths = [
    ...resumeAnalysis.strongestEvidence.slice(0, 6),
    ...matchedKeywords.map((k) => `Clear alignment on ${k} — mirrors the job description.`),
  ].sort((a, b) => a.localeCompare(b));

  const improvementSuggestions = [
    ...match.suggestedImprovements,
    ...resumeAnalysis.portfolioOpportunities.slice(0, 3),
  ].sort((a, b) => a.localeCompare(b));

  const bullets = extractResumeBulletLines(resumeText);
  const rewrittenBullets = buildRewrittenBullets(
    bullets,
    missingKeywords.length ? missingKeywords : ["the role"],
  );
  const likelyInterviewQuestions = buildLikelyQuestions(match, jobAnalysis, resumeAnalysis);

  const topGaps = [
    ...(match.gapSeverity ?? [])
      .filter((g) => g.severity === "high" || g.severity === "medium")
      .map((g) => `${g.skill}: ${g.reason}`),
    ...missingKeywords.map((k) => `Deepen ${k} with a shipped example, metrics, and failure modes.`),
  ].sort((a, b) => a.localeCompare(b));

  const strengthsToDefendBase = [
    ...new Set([
      ...matchedKeywords.map((k) => `Defend depth in ${k} with architecture and testing choices.`),
      ...strengths.slice(0, 4),
    ]),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);

  const gapsToPrepareBase = [
    ...new Set([...topGaps, ...improvementSuggestions.slice(0, 4)]),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 12);

  const strengthsToDefend =
    strengthsToDefendBase.length > 0
      ? strengthsToDefendBase
      : ["Anchor answers to verbs and metrics that already exist in your resume — avoid generic claims."];

  const gapsToPrepare =
    gapsToPrepareBase.length > 0
      ? gapsToPrepareBase
      : ["Mirror 6–10 high-signal terms from the job description in your summary without fabricating experience."];

  const pitchSkills = matchedKeywords.slice(0, 3).join(", ") || "your strongest delivery themes";
  const suggestedPitch = `I match what you need on ${pitchSkills}: I ship iteratively, communicate trade-offs, and care about reliability — happy to dive into how that maps to this role.`;

  return {
    overallScore,
    technicalScore,
    seniorityScore,
    keywordCoverageScore,
    interviewReadinessScore,
    matchedKeywords,
    missingKeywords,
    weakSignals,
    strengths,
    improvementSuggestions,
    rewrittenBullets,
    likelyInterviewQuestions,
    scoreBreakdown: breakdown,
    gapSeverity: match.gapSeverity,
    practiceContext: {
      resumeSummary: summarize(resumeText, 420),
      jobSummary: summarize(pipeline.jobInput.description, 420),
      strengthsToDefend: [...new Set(strengthsToDefend)].sort((a, b) => a.localeCompare(b)).slice(0, 8),
      gapsToPrepare: [...new Set(gapsToPrepare)].sort((a, b) => a.localeCompare(b)).slice(0, 10),
      suggestedPitch,
    },
  };
}

/** Convenience: paste text → {@link AtsAnalysisResult} via career-agents. */
export function analyzeAtsWithCareerAgents(resumeText: string, jobDescriptionText: string): AtsAnalysisResult {
  const pipeline = runCareerAgentsPipeline(resumeText, jobDescriptionText);
  return mapCareerAgentsToAtsResult(pipeline, resumeText);
}
