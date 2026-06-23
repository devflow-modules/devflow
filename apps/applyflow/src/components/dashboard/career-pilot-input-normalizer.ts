import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import { isCareerPilotIntent, type CareerPilotIntent } from "./career-pilot-content";
export { PILOT_SKILL_CATALOG } from "./career-pilot-skill-catalog";
import { PILOT_SKILL_CATALOG } from "./career-pilot-skill-catalog";
import {
  type CareerPilotSimpleInputs,
  MAX_PILOT_JOB_DESCRIPTION_LENGTH,
  MAX_PILOT_RESUME_TEXT_LENGTH,
  MIN_PILOT_JOB_DESCRIPTION_LENGTH,
  MIN_PILOT_RESUME_TEXT_LENGTH,
} from "./career-pilot-simple-inputs";
import {
  buildParticipantParseSummary,
  extractResumeBulletsFromDocument,
  mapParsedResumeToLineExperiences,
  mapParsedResumeToProjects,
  parseResumeDocument,
} from "./career-pilot-resume-section-parser";
import { isExperienceHeader, type ParsedResumeExperience } from "./career-pilot-resume-line-parser";

export type { ParsedResumeExperience } from "./career-pilot-resume-line-parser";
export type { ResumeParseConfidence } from "./career-pilot-resume-section-parser";

const MAX_LINES = 50;
const MAX_LINE_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 500;

const SECTION_HEADER_PATTERN =
  /^(experi[eê]ncia(\s+profissional)?|form[aã]o(\s+acad[eê]mica)?|compet[eê]ncias|competencias|habilidades|skills|education|experience|projects?|projetos?|certifica[cç][oõ]es|idiomas|resumo( profissional)?|summary|work history|employment)$/i;

const ACTION_LINE_PATTERN =
  /\b(desenvolvi|implementei|reduzi|criei|liderei|constru[ií]|built|led|developed|implemented|reduced)\b/i;

const IDENTITY_LINE_PATTERN = /^([\p{L}\s.'-]+)\s*[—–-]\s*([\p{L}\s.'-]+)$/u;

const COMPANY_PERIOD_HEADER_PATTERN =
  /^[\p{L}\d\s.&''\-]+[\(（]\s*(19|20)\d{2}\s*[–\-—]\s*(presente|(19|20)\d{2})\s*[\)）]/iu;

const ROLE_PERIOD_PATTERN = /[\—\-–]\s*(19|20)\d{2}\s*(a|até|–|-)\s*(19|20)\d{2}\b/i;

const PROFESSIONAL_TITLE_PATTERN =
  /\b(desenvolvedor|desenvolvedora|engenheir|analista|designer|gerente|coordenador|consultor|arquiteto|software|backend|frontend|full[\s-]?stack|sênior|senior|pleno|júnior|junior)\b/i;

const EXPERIENCE_BULLET_PREFIX_PATTERN =
  /^(trabalhei|ajudei|participei|responsável|responsavel|atuei|colabor|conhecimento|fiz|realizei|executei)\b/i;

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 60 || ACTION_LINE_PATTERN.test(trimmed)) {
    return false;
  }
  return SECTION_HEADER_PATTERN.test(trimmed);
}

const SKILL_LINE_PATTERN = /^(compet[eê]ncias|competencias|habilidades|skills)\s*:/i;

function isSkillListLine(line: string): boolean {
  return SKILL_LINE_PATTERN.test(line.trim());
}

function parseIdentityLine(line: string): { name: string; role: string } | null {
  const match = line.trim().match(IDENTITY_LINE_PATTERN);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { name: match[1].trim(), role: match[2].trim() };
}

function isCompanyPeriodHeader(line: string): boolean {
  const trimmed = line.trim();
  return COMPANY_PERIOD_HEADER_PATTERN.test(trimmed) || ROLE_PERIOD_PATTERN.test(trimmed);
}

function looksLikeExperienceBulletLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  if (ACTION_LINE_PATTERN.test(trimmed)) {
    return true;
  }
  if (EXPERIENCE_BULLET_PREFIX_PATTERN.test(trimmed)) {
    return true;
  }
  if (isExperienceHeader(trimmed)) {
    return false;
  }
  return /[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 10 && trimmed.length < 90;
}

function isProfessionalTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 15 || trimmed.length > 80) {
    return false;
  }
  if (parseIdentityLine(trimmed)) {
    return false;
  }
  if (isSectionHeader(trimmed) || isSkillListLine(trimmed) || isCompanyPeriodHeader(trimmed)) {
    return false;
  }
  if (ACTION_LINE_PATTERN.test(trimmed) || EXPERIENCE_BULLET_PREFIX_PATTERN.test(trimmed)) {
    return false;
  }
  return PROFESSIONAL_TITLE_PATTERN.test(trimmed);
}

function isDescriptiveSummaryParagraph(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20 || isSkillListLine(trimmed) || parseIdentityLine(trimmed)) {
    return false;
  }

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    const experienceLikeCount = sentences.filter((sentence) => looksLikeExperienceBulletLine(sentence)).length;
    if (experienceLikeCount >= 2) {
      return false;
    }
  }

  if (/\bcom experiência\b/i.test(trimmed) || /\bcom experiencia\b/i.test(trimmed)) {
    return true;
  }

  if (
    /\b(experiência|experiencia|especializad[oa]|focad[oa]|profissional)\b/i.test(trimmed) &&
    trimmed.length >= 30
  ) {
    return true;
  }

  if (sentences.length === 1 && !looksLikeExperienceBulletLine(trimmed)) {
    return trimmed.length >= 25 && /\b(em|com|para|usando|através|atraves)\b/i.test(trimmed);
  }

  return false;
}

function extractRoleFromIdentityLine(line: string): string | null {
  const identity = parseIdentityLine(line);
  if (!identity || identity.role.length < 10) {
    return null;
  }
  return identity.role.slice(0, MAX_SUMMARY_LENGTH);
}

function lineMatchesSummary(line: string, summary: string): boolean {
  const lowered = line.trim().toLowerCase();
  const summaryNorm = summary.trim().toLowerCase();
  if (!summaryNorm) {
    return false;
  }
  if (lowered === summaryNorm) {
    return true;
  }
  if (summaryNorm.includes(lowered) || lowered.includes(summaryNorm)) {
    return true;
  }
  const identity = parseIdentityLine(line);
  if (identity && identity.role.toLowerCase() === summaryNorm) {
    return true;
  }
  return false;
}

export function parseResumeFromText(resumeText: string) {
  return parseResumeDocument(normalizeResumeText(resumeText));
}

export function extractResumeExperiences(resumeText: string, _summaryToExclude?: string): ParsedResumeExperience[] {
  return mapParsedResumeToLineExperiences(parseResumeFromText(resumeText));
}

export function extractResumeBulletLines(resumeText: string, _summaryToExclude?: string): string[] {
  return extractResumeBulletsFromDocument(parseResumeFromText(resumeText));
}

/**
 * Extracts the first descriptive paragraph before experience sections.
 * Preserves original text; does not summarize with AI.
 */
export function extractProfessionalSummary(resumeText: string): string {
  const parsed = parseResumeFromText(resumeText);
  if (parsed.summary?.trim()) {
    return parsed.summary.trim().slice(0, MAX_SUMMARY_LENGTH);
  }
  if (parsed.identity?.targetRole?.trim()) {
    return parsed.identity.targetRole.trim().slice(0, MAX_SUMMARY_LENGTH);
  }

  const normalized = normalizeResumeText(resumeText);
  if (!normalized) {
    return "";
  }

  const rawLines = normalized.split("\n").map((line) => line.trim());
  const paragraphs: string[] = [];
  const preSectionLines: string[] = [];
  let current: string[] = [];

  for (const line of rawLines) {
    if (!line) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }
    if (isSectionHeader(line) || isSkillListLine(line)) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
      }
      break;
    }

    const trimmed = line.replace(/^[\s•\-*]+/, "").trim();
    preSectionLines.push(trimmed);

    if (looksLikeExperienceBulletLine(trimmed)) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      break;
    }

    current.push(trimmed);
  }
  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  for (const paragraph of paragraphs) {
    const candidate = paragraph.trim();
    if (isDescriptiveSummaryParagraph(candidate)) {
      return candidate.slice(0, MAX_SUMMARY_LENGTH);
    }
  }

  for (const line of preSectionLines) {
    const roleFromIdentity = extractRoleFromIdentityLine(line);
    if (roleFromIdentity) {
      return roleFromIdentity;
    }
    if (isProfessionalTitleLine(line)) {
      return line.trim().slice(0, MAX_SUMMARY_LENGTH);
    }
  }

  return "";
}

export function extractResumeLines(resumeText: string, summaryToExclude?: string): string[] {
  void summaryToExclude;
  return extractResumeBulletLines(resumeText);
}

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
  const parsedResume = parseResumeFromText(resumeText);
  const resumeSummary = extractProfessionalSummary(resumeText);
  const parsedExperiences = mapParsedResumeToLineExperiences(parsedResume);
  const resumeLines = extractResumeBulletsFromDocument(parsedResume);
  const primaryExperience = parsedExperiences[0];
  const skills =
    parsedResume.skills.length > 0 ? parsedResume.skills : extractLikelySkills(resumeText);
  const projects = mapParsedResumeToProjects(parsedResume);
  const requirements = extractJobRequirements(jobDescription);
  const availabilityParts = [input.weeklyAvailability.trim(), input.constraints.trim()].filter(Boolean);
  const unusedInfoCount =
    parsedResume.unclassifiedLines.length +
    parsedResume.contactLines.length +
    parsedResume.linkLines.length;

  const baseFields = {
    resumeSummary,
    resumeBullets: resumeLines.join("\n"),
    resumeSkills: skills.join(", "),
    resumeExperienceCompany: primaryExperience?.company !== "—" ? (primaryExperience?.company ?? "") : "",
    resumeExperienceTitle: primaryExperience?.title !== "—" ? (primaryExperience?.title ?? "") : "",
    resumeExperiencesJson: JSON.stringify(parsedExperiences),
    resumeProjectsJson: JSON.stringify(projects),
    resumeEducationJson: JSON.stringify(parsedResume.education),
    resumeLanguagesJson: JSON.stringify(parsedResume.languages),
    resumeParseConfidence: parsedResume.confidence,
    resumeParseSummary: buildParticipantParseSummary(parsedResume),
    resumeUnusedInfoCount: String(unusedInfoCount),
    jobRequirements: requirements.join("\n"),
    availability: availabilityParts.join(" · "),
  };

  if (isCareerPilotIntent(intent) && intent === "plan_career_strategy") {
    return {
      ...baseFields,
      targetRoles: joinTargetRoles(input.careerGoal),
    };
  }

  return {
    ...baseFields,
    targetRoles: input.targetRole.trim(),
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
