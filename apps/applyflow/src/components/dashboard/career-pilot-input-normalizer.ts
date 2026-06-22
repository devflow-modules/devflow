import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import { isCareerPilotIntent, type CareerPilotIntent } from "./career-pilot-content";
import {
  type CareerPilotSimpleInputs,
  MAX_PILOT_JOB_DESCRIPTION_LENGTH,
  MAX_PILOT_RESUME_TEXT_LENGTH,
  MIN_PILOT_JOB_DESCRIPTION_LENGTH,
  MIN_PILOT_RESUME_TEXT_LENGTH,
} from "./career-pilot-simple-inputs";

export const PILOT_SKILL_CATALOG = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "NestJS",
  "Prisma",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Jest",
  "Vitest",
  "Playwright",
  "Cypress",
  "Git",
  "GitHub Actions",
  "REST",
  "GraphQL",
] as const;

const MAX_LINES = 50;
const MAX_LINE_LENGTH = 500;

export function normalizeResumeText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_PILOT_RESUME_TEXT_LENGTH);
}

export function normalizeJobDescription(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_PILOT_JOB_DESCRIPTION_LENGTH);
}

export function extractResumeLines(resumeText: string): string[] {
  const normalized = normalizeResumeText(resumeText);
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean)
    .map((line) => line.slice(0, MAX_LINE_LENGTH));

  if (lines.length > 1) {
    return lines.slice(0, MAX_LINES);
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8)
    .slice(0, MAX_LINES);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractLikelySkills(text: string): string[] {
  const normalized = normalizeResumeText(text);
  if (!normalized) {
    return [];
  }

  const haystack = normalized.toLowerCase();
  const found: string[] = [];
  const seen = new Set<string>();

  for (const skill of PILOT_SKILL_CATALOG) {
    const pattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, "i");
    if (pattern.test(haystack) && !seen.has(skill.toLowerCase())) {
      seen.add(skill.toLowerCase());
      found.push(skill);
    }
  }

  return found.slice(0, MAX_LINES);
}

export function extractJobRequirements(jobDescription: string): string[] {
  const normalized = normalizeJobDescription(jobDescription);
  if (!normalized) {
    return [];
  }

  const lineCandidates = normalized
    .split("\n")
    .map((line) => line.replace(/^[\s•\-*\d.)]+/, "").trim())
    .filter((line) => line.length >= 3);

  if (lineCandidates.length >= 2) {
    return lineCandidates.slice(0, MAX_LINES);
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8)
    .slice(0, MAX_LINES);
}

export function extractJobKeywords(text: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const token of text.toLowerCase().split(/[^\p{L}\p{N}+#.]+/u)) {
    const trimmed = token.trim();
    if (trimmed.length < 3 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    keywords.push(trimmed);
  }

  return keywords.slice(0, 100);
}

function joinTargetRoles(goal: string): string {
  const parts = goal
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : goal.trim();
}

export function buildCareerSpecialistFieldsFromSimpleInputs(
  input: CareerPilotSimpleInputs,
  intent: CareerChatIntent,
): CareerSpecialistFields {
  const resumeText = normalizeResumeText(input.resumeText);
  const jobDescription = normalizeJobDescription(input.jobDescription);
  const resumeLines = extractResumeLines(resumeText);
  const skills = extractLikelySkills(resumeText);
  const requirements = extractJobRequirements(jobDescription);
  const availabilityParts = [input.weeklyAvailability.trim(), input.constraints.trim()].filter(Boolean);

  if (isCareerPilotIntent(intent) && intent === "plan_career_strategy") {
    return {
      resumeBullets: resumeLines.join("\n"),
      resumeSkills: skills.join(", "),
      jobRequirements: requirements.join("\n"),
      targetRoles: joinTargetRoles(input.careerGoal),
      availability: availabilityParts.join(" · "),
    };
  }

  return {
    resumeBullets: resumeLines.join("\n"),
    resumeSkills: skills.join(", "),
    jobRequirements: requirements.join("\n"),
    targetRoles: input.targetRole.trim(),
    availability: availabilityParts.join(" · "),
  };
}

export function hasSimplePilotAnalysisInputs(
  action: CareerPilotIntent,
  input: CareerPilotSimpleInputs,
): boolean {
  const resumeText = normalizeResumeText(input.resumeText);
  const jobDescription = normalizeJobDescription(input.jobDescription);
  const resumeOk = resumeText.length >= MIN_PILOT_RESUME_TEXT_LENGTH;

  if (action === "plan_career_strategy") {
    return input.careerGoal.trim().length > 0;
  }

  if (action === "analyze_ats_compatibility") {
    return resumeOk && jobDescription.length >= MIN_PILOT_JOB_DESCRIPTION_LENGTH;
  }

  return resumeOk;
}
