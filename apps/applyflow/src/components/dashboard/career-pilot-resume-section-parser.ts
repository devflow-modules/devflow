import { __resumeAnalystTestUtils } from "../../../../../packages/career-core/src/career-agents/agents/resume-analyst";
import { PILOT_SKILL_CATALOG } from "./career-pilot-skill-catalog";
import {
  isExperienceHeader,
  parseExperienceHeader,
  type ParsedResumeExperience as LineParsedExperience,
} from "./career-pilot-resume-line-parser";

export type ResumeSectionKind =
  | "identity"
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "languages"
  | "contact"
  | "links"
  | "unknown";

export type ParsedResumeExperience = {
  company?: string;
  title?: string;
  period?: string;
  bullets: string[];
};

export type ParsedResumeProject = {
  name?: string;
  description?: string;
  stack: string[];
  bullets: string[];
};

export type ResumeParserDiagnostics = {
  detectedSections: Record<string, number>;
  experienceCount: number;
  projectCount: number;
  bulletCount: number;
  skillCount: number;
  ignoredLineCount: number;
  unclassifiedLineCount: number;
  truncated: boolean;
};

export type ResumeParseConfidence = "high" | "medium" | "low";

export type ParsedResumeDocument = {
  identity?: {
    name?: string;
    targetRole?: string;
  };
  summary?: string;
  experiences: ParsedResumeExperience[];
  projects: ParsedResumeProject[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  contactLines: string[];
  linkLines: string[];
  unclassifiedLines: string[];
  diagnostics: ResumeParserDiagnostics;
  confidence: ResumeParseConfidence;
};

export type ResumeBulletKind =
  | "strong_with_metric"
  | "strong_without_metric"
  | "vague"
  | "invalid_fragment";

export type MetricContext =
  | "professional_result"
  | "team_size"
  | "scale"
  | "time_saved"
  | "money"
  | "percentage"
  | "date"
  | "version"
  | "course_duration"
  | "contact_number"
  | "unknown";

const MAX_EXPERIENCES = 12;
const MAX_BULLETS_PER_EXPERIENCE = 12;
const MAX_TOTAL_BULLETS = 60;
const MAX_PROJECTS = 12;
const MAX_SKILLS = 50;
const MAX_JOINED_LINE_LENGTH = 320;

const { startsWithActionVerb, classifyBulletStrength, hasMeaningfulMetric } =
  __resumeAnalystTestUtils;

const SECTION_CATALOG: Array<{ kind: ResumeSectionKind; labels: string[] }> = [
  {
    kind: "summary",
    labels: [
      "resumo",
      "resumo profissional",
      "perfil",
      "perfil profissional",
      "sobre",
      "objetivo",
      "professional summary",
      "summary",
      "profile",
    ],
  },
  {
    kind: "experience",
    labels: [
      "experiencia",
      "experiencia profissional",
      "historico profissional",
      "experience",
      "professional experience",
      "work experience",
      "employment",
    ],
  },
  {
    kind: "projects",
    labels: [
      "projetos",
      "projetos pessoais",
      "projetos profissionais",
      "portfolio",
      "portifolio",
      "projects",
      "personal projects",
    ],
  },
  {
    kind: "skills",
    labels: [
      "competencias",
      "competencias tecnicas",
      "habilidades",
      "tecnologias",
      "stack",
      "skills",
      "technical skills",
      "technologies",
    ],
  },
  {
    kind: "education",
    labels: [
      "educacao",
      "formacao",
      "formacao academica",
      "educacao e certificacoes",
      "academic background",
      "education",
    ],
  },
  {
    kind: "certifications",
    labels: ["certificacoes", "cursos", "cursos e certificacoes", "certifications", "courses"],
  },
  {
    kind: "languages",
    labels: ["idiomas", "linguas", "languages"],
  },
  {
    kind: "contact",
    labels: ["contato", "contatos", "contact", "contact information"],
  },
  {
    kind: "links",
    labels: ["links", "social", "profiles"],
  },
];

const EMAIL_PATTERN = /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/i;
const URL_PATTERN = /^(https?:\/\/|www\.|linkedin\.com|github\.com|gitlab\.com|bitbucket\.org)/i;
const PHONE_PATTERN = /^\+?\d[\d\s().-]{7,}\d$/;
const PERIOD_ONLY_PATTERN =
  /^(?:\(?\s*)?(?:19|20)\d{2}\s*[–\-—]\s*(?:presente|atual|até o momento|(19|20)\d{2})(?:\s*\)?)?$/iu;
const STACK_LINE_PATTERN = /^stack\s*:/i;
const VERSION_TECH_PATTERN =
  /\b(node\.js|react|next\.js|vue|angular|python|java|typescript|express|prisma)\s*\d+/i;
const COURSE_DURATION_PATTERN =
  /\b\d+\s*horas?\b.*\b(curso|certifica|formacao|capacita|treinamento)\b|\b(curso|certifica|formacao)\b.*\b\d+\s*horas?\b/i;
const LANGUAGE_LINE_PATTERN =
  /^(portugu[eê]s|ingl[eê]s|espanhol|franc[eê]s|alem[aã]o|italiano|mandarim|english|spanish|french|german)\b/i;
const EDUCATION_LINE_PATTERN =
  /\b(p[oó]s-gradua|gradua|mestrado|doutorado|bacharel|licenciatura|formacao|certifica|curso|mba|faculdade|universidade|engenharia)\b/i;

const IDENTITY_LINE_PATTERN = /^([\p{L}\s.'-]+)\s*[—–-]\s*([\p{L}\s.'-]+)$/u;

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeHeadingKey(line: string): string {
  return stripAccents(line)
    .replace(/[:：]\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanLine(line: string): string {
  return line.replace(/^[\s•\-*]+/, "").trim();
}

function isConclusivePunctuation(line: string): boolean {
  return /[.!?]$/.test(line.trim());
}

function looksLikePeriodOnly(line: string): boolean {
  const trimmed = cleanLine(line);
  return PERIOD_ONLY_PATTERN.test(trimmed) || Boolean(parseExperienceHeader(trimmed)?.period && trimmed.length < 40);
}

function looksLikePersonName(text: string): boolean {
  const trimmed = text.trim();
  if (
    /\b(empresa|corp|corporation|ltd|inc|tech|s\.?a\.?|group|labs|consulting|solutions|studio)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (/\d|[\(（]/.test(trimmed)) {
    return false;
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 5 && words.every((word) => /^[\p{L}.'-]+$/u.test(word));
}

function looksLikeProfessionalTitle(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4 || trimmed.length > 90) {
    return false;
  }
  return (
    /\b(desenvolvedor|desenvolvedora|engenheir|analista|designer|gerente|coordenador|consultor|arquiteto|founder|product engineer|full stack|backend|frontend|software|sênior|senior|pleno|júnior|junior|estagi[aá]ri)\b/i.test(
      trimmed,
    ) || /\b(de|da|do)\s+\p{L}/iu.test(trimmed)
  );
}

function looksLikeStandaloneCompany(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 80 || startsWithActionVerb(trimmed)) {
    return false;
  }
  if (looksLikePersonName(trimmed)) {
    return false;
  }
  if (isConclusivePunctuation(trimmed) && trimmed.split(/\s+/).length >= 6) {
    return false;
  }
  if (looksLikeProfessionalTitle(trimmed) && !/\b(labs|studio|solutions|tech|corp|inc)\b/i.test(trimmed)) {
    return false;
  }
  return !looksLikePeriodOnly(trimmed) && !isContactLine(trimmed) && !isSkillTokenLine(trimmed);
}

export function isSectionHeading(line: string): boolean {
  const trimmed = cleanLine(line);
  if (!trimmed || trimmed.length > 60) {
    return false;
  }
  if (startsWithActionVerb(trimmed)) {
    return false;
  }
  if (isConclusivePunctuation(trimmed) && trimmed.split(/\s+/).length >= 5) {
    return false;
  }
  const key = normalizeHeadingKey(trimmed);
  return SECTION_CATALOG.some((entry) => entry.labels.includes(key));
}

export function resolveSectionKind(line: string): ResumeSectionKind {
  const key = normalizeHeadingKey(line);
  const match = SECTION_CATALOG.find((entry) => entry.labels.includes(key));
  return match?.kind ?? "unknown";
}

export function isContactLine(line: string): boolean {
  const trimmed = cleanLine(line);
  if (!trimmed) {
    return false;
  }
  return EMAIL_PATTERN.test(trimmed) || URL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed);
}

export function isLinkLine(line: string): boolean {
  const trimmed = cleanLine(line);
  return URL_PATTERN.test(trimmed) || /linkedin\.com|github\.com|gitlab\.com/i.test(trimmed);
}

function isSkillTokenLine(line: string): boolean {
  const trimmed = cleanLine(line);
  if (!trimmed) {
    return false;
  }
  const catalog = new Set(PILOT_SKILL_CATALOG.map((skill) => skill.toLowerCase()));
  const delimiterTokens = trimmed.split(/\s*[|,;•/]\s*/).filter(Boolean);
  const tokens =
    delimiterTokens.length > 1
      ? delimiterTokens
      : trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }
  if (tokens.length === 1 && trimmed.length > 40) {
    return false;
  }
  if (tokens.length > 1 && trimmed.length > 240) {
    return false;
  }
  return tokens.every((token) => catalog.has(token.toLowerCase()));
}

function isEducationLine(line: string): boolean {
  const trimmed = cleanLine(line);
  return EDUCATION_LINE_PATTERN.test(trimmed) || /\b(19|20)\d{2}\b/.test(trimmed);
}

function isLanguageLine(line: string): boolean {
  return LANGUAGE_LINE_PATTERN.test(cleanLine(line));
}

function isDateOnlyLine(line: string): boolean {
  const trimmed = cleanLine(line);
  return /^(19|20)\d{2}$/.test(trimmed) || looksLikePeriodOnly(trimmed);
}

function isInvalidFragment(line: string): boolean {
  const trimmed = cleanLine(line);
  if (!trimmed || trimmed.length < 3) {
    return true;
  }
  if (VERSION_TECH_PATTERN.test(trimmed)) {
    return true;
  }
  if (isSectionHeading(trimmed) || isContactLine(trimmed) || isEducationLine(trimmed) || isLanguageLine(trimmed)) {
    return true;
  }
  if (isDateOnlyLine(trimmed) || isSkillTokenLine(trimmed)) {
    return true;
  }
  if (trimmed.length <= 25 && !startsWithActionVerb(trimmed) && !/[.!?]$/.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    if (words.length <= 3 && !looksLikeProfessionalTitle(trimmed) && !looksLikeStandaloneCompany(trimmed)) {
      return true;
    }
  }
  if (/^(banco de dados|autentica[cç][aã]o|compet[eê]ncias t[eé]cnicas)\.?$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function classifyResumeBulletKind(line: string): ResumeBulletKind {
  if (isInvalidFragment(line)) {
    return "invalid_fragment";
  }
  return classifyBulletStrength(line) as ResumeBulletKind;
}

export function classifyMetricContext(text: string): MetricContext {
  const trimmed = text.trim();
  if (COURSE_DURATION_PATTERN.test(trimmed) || (/\b\d+\s*horas?\b/i.test(trimmed) && isEducationLine(trimmed))) {
    return "course_duration";
  }
  if (isDateOnlyLine(trimmed) || isExperienceHeader(trimmed)) {
    return "date";
  }
  if (VERSION_TECH_PATTERN.test(trimmed)) {
    return "version";
  }
  if (COURSE_DURATION_PATTERN.test(trimmed)) {
    return "course_duration";
  }
  if (/\b\d+\s*horas?\b/i.test(trimmed) && isEducationLine(trimmed)) {
    return "course_duration";
  }
  if (PHONE_PATTERN.test(trimmed)) {
    return "contact_number";
  }
  if (/\d+\s*%/.test(trimmed) || /\bredu[cç][aã]o\b.*\d+\s*%/i.test(trimmed)) {
    return "percentage";
  }
  if (/R\$\s*[\d.,]+/i.test(trimmed)) {
    return "money";
  }
  if (/\b\d+\s*(pessoas?|membros?|devs?|engenheiros?|squads?|times?|clientes?|parceiros?|usu[aá]rios?)\b/i.test(trimmed)) {
    return "team_size";
  }
  if (/\b\d+[\d.,]*\s*(mil|milh[oõ]es?|mi)\b/i.test(trimmed) || /\b\d+x\b/i.test(trimmed)) {
    return "scale";
  }
  if (/\b(reduzi|economizei|otimizei)\b.*\b\d+\s*(horas?|dias?|semanas?)\b/i.test(trimmed)) {
    return "time_saved";
  }
  if (hasMeaningfulMetric(trimmed)) {
    return "professional_result";
  }
  return "unknown";
}

function splitSkillTokens(line: string): string[] {
  const delimiterTokens = line
    .split(/\s*[|,;•/]\s*|\n/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (delimiterTokens.length > 1) {
    return delimiterTokens;
  }
  const spaceTokens = line
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (spaceTokens.length > 1) {
    return spaceTokens;
  }
  return delimiterTokens;
}

function normalizeSkillToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 40) {
    return null;
  }
  for (const skill of PILOT_SKILL_CATALOG) {
    if (skill.toLowerCase() === trimmed.toLowerCase()) {
      return skill;
    }
  }
  if (/^[A-Za-z+#.][A-Za-z0-9+#./\s-]{1,30}$/.test(trimmed) && trimmed.split(/\s+/).length <= 3) {
    return trimmed
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return null;
}

function addUniqueSkills(target: string[], incoming: string[]) {
  const seen = new Set(target.map((skill) => skill.toLowerCase()));
  for (const skill of incoming) {
    const normalized = normalizeSkillToken(skill);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      target.push(normalized);
    }
  }
}

function parseIdentityLines(lines: string[]): { name?: string; targetRole?: string } {
  if (lines.length === 0) {
    return {};
  }
  const first = cleanLine(lines[0] ?? "");
  const second = cleanLine(lines[1] ?? "");

  const identityMatch = first.match(IDENTITY_LINE_PATTERN);
  if (identityMatch?.[1] && identityMatch[2] && looksLikePersonName(identityMatch[1])) {
    return { name: identityMatch[1].trim(), targetRole: identityMatch[2].trim() };
  }

  if (looksLikePersonName(first) && looksLikeProfessionalTitle(second)) {
    return { name: first, targetRole: second };
  }

  if (looksLikeProfessionalTitle(first) && first.length <= 80) {
    return { targetRole: first };
  }

  return {};
}

function shouldJoinPdfLines(previous: string, next: string): boolean {
  const prev = cleanLine(previous);
  const nextLine = cleanLine(next);
  if (!prev || !nextLine) {
    return false;
  }
  if (isSectionHeading(prev) || isSectionHeading(nextLine)) {
    return false;
  }
  if (splitEmbeddedSectionHeadings(prev).length > 1 || splitEmbeddedSectionHeadings(nextLine).length > 1) {
    return false;
  }
  if (isConclusivePunctuation(prev)) {
    return false;
  }
  if (
    isExperienceHeader(nextLine) ||
    isExperienceHeader(prev) ||
    looksLikePeriodOnly(nextLine) ||
    looksLikePeriodOnly(prev) ||
    looksLikeStandaloneCompany(nextLine) ||
    looksLikeStandaloneCompany(prev) ||
    looksLikeProfessionalTitle(nextLine) ||
    looksLikeProfessionalTitle(prev) ||
    isContactLine(nextLine) ||
    STACK_LINE_PATTERN.test(nextLine)
  ) {
    return false;
  }
  if (startsWithActionVerb(nextLine) && prev.split(/\s+/).length >= 4) {
    return false;
  }
  if (/^[A-ZÁÉÍÓÚÃÕÇ\s&]+$/.test(prev) && prev.length <= 40) {
    return false;
  }
  return `${prev} ${nextLine}`.length <= MAX_JOINED_LINE_LENGTH;
}

function findHeadingPrefixLength(line: string, label: string): number {
  const words = stripAccents(line)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const labelWords = label.split(/\s+/).filter(Boolean);
  if (words.length <= labelWords.length) {
    return stripAccents(line).toLowerCase() === label ? line.length : 0;
  }
  const matches = labelWords.every((word, index) => words[index] === word);
  if (!matches) {
    return 0;
  }
  return line
    .split(/\s+/)
    .slice(0, labelWords.length)
    .join(" ").length;
}

function splitEmbeddedSectionHeadings(line: string): string[] {
  const trimmed = cleanLine(line);
  if (!trimmed) {
    return [];
  }

  const normalizedFull = normalizeHeadingKey(trimmed);
  if (SECTION_CATALOG.some((entry) => entry.labels.includes(normalizedFull))) {
    return [trimmed];
  }

  for (const entry of SECTION_CATALOG) {
    for (const label of entry.labels) {
      const prefix = `${label} `;
      if (normalizedFull.startsWith(prefix) && normalizedFull.length > prefix.length + 2) {
        const prefixLength = findHeadingPrefixLength(trimmed, label);
        if (prefixLength <= 0) {
          continue;
        }
        const heading = trimmed.slice(0, prefixLength).trim();
        const rest = trimmed.slice(prefixLength).trim();
        return [heading, ...splitEmbeddedSectionHeadings(rest)];
      }
    }
  }

  return [trimmed];
}

function expandResumeLines(rawLines: string[]): string[] {
  const joined = joinPdfBrokenLines(rawLines);
  return joined.flatMap((line) => splitEmbeddedSectionHeadings(line));
}

export function joinPdfBrokenLines(lines: string[]): string[] {
  const joined: string[] = [];
  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) {
      continue;
    }
    const last = joined[joined.length - 1];
    if (last && shouldJoinPdfLines(last, line)) {
      joined[joined.length - 1] = `${last} ${line}`;
    } else {
      joined.push(line);
    }
  }
  return joined;
}

type ExperienceDraft = ParsedResumeExperience & { headerLines: string[] };

function flushExperienceDraft(draft: ExperienceDraft | null, experiences: ParsedResumeExperience[]) {
  if (!draft) {
    return;
  }
  const hasHeader = draft.company || draft.title || draft.period;
  const hasBullets = draft.bullets.length > 0;
  if (!hasHeader && !hasBullets) {
    return;
  }
  experiences.push({
    company: draft.company,
    title: draft.title,
    period: draft.period,
    bullets: draft.bullets.slice(0, MAX_BULLETS_PER_EXPERIENCE),
  });
}

function applyExperienceHeaderLines(draft: ExperienceDraft, headerLines: string[]) {
  const combined = headerLines.map(cleanLine).filter(Boolean);
  if (combined.length === 0) {
    return;
  }

  if (combined.length >= 3 && looksLikePeriodOnly(combined[combined.length - 1]!)) {
    draft.company = combined[0];
    draft.title = combined[1];
    draft.period = combined[combined.length - 1];
    return;
  }

  if (combined.length === 2 && looksLikePeriodOnly(combined[1]!)) {
    draft.period = combined[1];
    if (looksLikeProfessionalTitle(combined[0]!)) {
      draft.title = combined[0];
    } else {
      draft.company = combined[0];
    }
    return;
  }

  const singleLine = combined.join(" — ");
  const parsedSingle = parseExperienceHeader(singleLine);
  if (parsedSingle?.company || parsedSingle?.title || parsedSingle?.period) {
    draft.company = parsedSingle.company ?? draft.company;
    draft.title = parsedSingle.title ?? draft.title;
    draft.period = parsedSingle.period ?? draft.period;
    return;
  }

  if (combined.length === 1) {
    const only = combined[0]!;
    if (looksLikePeriodOnly(only)) {
      draft.period = only;
    } else if (looksLikeProfessionalTitle(only)) {
      draft.title = only;
    } else {
      draft.company = only;
    }
  }
}

function isProfessionalBulletLine(line: string): boolean {
  const trimmed = cleanLine(line);
  if (
    /\b(com experi[eê]ncia|com experiencia|produtos saas)\b/i.test(trimmed) &&
    !startsWithActionVerb(trimmed)
  ) {
    return false;
  }
  if (/^[\s•\-*]+/.test(line) && trimmed.length >= 8) {
    return true;
  }
  if (isInvalidFragment(trimmed)) {
    return false;
  }
  if (startsWithActionVerb(trimmed)) {
    return true;
  }
  if (/^(trabalhei|ajudei|participei|respons[aá]vel|atuei|conhecimento|cria[cç][aã]o|desenvolvimento|implementa[cç][aã]o|integra[cç][aã]o)\b/i.test(trimmed)) {
    return trimmed.split(/\s+/).length >= 3;
  }
  return isConclusivePunctuation(trimmed) && trimmed.split(/\s+/).length >= 5;
}

function computeConfidence(doc: ParsedResumeDocument): ResumeParseConfidence {
  const bullets = doc.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0);
  const hasStructure =
    doc.summary ||
    Object.keys(doc.diagnostics.detectedSections).length >= 2 ||
    doc.experiences.length >= 1;
  const unclassifiedRatio =
    doc.unclassifiedLines.length /
    Math.max(1, bullets + doc.unclassifiedLines.length + doc.skills.length);

  if (
    doc.experiences.length >= 1 &&
    bullets >= 2 &&
    doc.skills.length >= 3 &&
    unclassifiedRatio <= 0.2 &&
    hasStructure
  ) {
    return "high";
  }
  if (doc.experiences.length >= 1 && bullets >= 1 && unclassifiedRatio <= 0.45) {
    return "medium";
  }
  return "low";
}

function emptyDiagnostics(): ResumeParserDiagnostics {
  return {
    detectedSections: {},
    experienceCount: 0,
    projectCount: 0,
    bulletCount: 0,
    skillCount: 0,
    ignoredLineCount: 0,
    unclassifiedLineCount: 0,
    truncated: false,
  };
}

export function parseResumeDocument(resumeText: string): ParsedResumeDocument {
  const normalized = resumeText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const doc: ParsedResumeDocument = {
    experiences: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    languages: [],
    contactLines: [],
    linkLines: [],
    unclassifiedLines: [],
    diagnostics: emptyDiagnostics(),
    confidence: "low",
  };

  if (!normalized) {
    doc.confidence = computeConfidence(doc);
    return doc;
  }

  const rawLines = normalized.split("\n").map(cleanLine).filter(Boolean);
  const lines = expandResumeLines(rawLines);
  const hasStructuredSections = lines.some((line) => isSectionHeading(line));

  let currentSection: ResumeSectionKind = hasStructuredSections ? "identity" : "unknown";
  let summaryLines: string[] = [];
  let experienceDraft: ExperienceDraft | null = null;
  let projectDraft: ParsedResumeProject | null = null;
  let totalBullets = 0;
  let truncated = false;

  const bumpSection = (kind: ResumeSectionKind) => {
    doc.diagnostics.detectedSections[kind] = (doc.diagnostics.detectedSections[kind] ?? 0) + 1;
  };

  const pushBullet = (draft: ExperienceDraft, bullet: string) => {
    if (totalBullets >= MAX_TOTAL_BULLETS) {
      truncated = true;
      return;
    }
    if (draft.bullets.length >= MAX_BULLETS_PER_EXPERIENCE) {
      truncated = true;
      return;
    }
    if (!isProfessionalBulletLine(bullet)) {
      doc.diagnostics.ignoredLineCount += 1;
      return;
    }
    draft.bullets.push(bullet.slice(0, 500));
    totalBullets += 1;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (isSectionHeading(line)) {
      flushExperienceDraft(experienceDraft, doc.experiences);
      experienceDraft = null;
      const pendingProject = projectDraft;
      if (
        pendingProject &&
        (pendingProject.name ||
          pendingProject.description ||
          pendingProject.bullets.length > 0)
      ) {
        doc.projects.push({
          name: pendingProject.name,
          description: pendingProject.description,
          stack: pendingProject.stack,
          bullets: pendingProject.bullets.slice(0, MAX_BULLETS_PER_EXPERIENCE),
        });
      }
      projectDraft = null;

      currentSection = resolveSectionKind(line);
      bumpSection(currentSection);
      if (currentSection === "summary") {
        summaryLines = [];
      }
      continue;
    }

    if (index < 3 && (currentSection === "identity" || currentSection === "unknown")) {
      const identity = parseIdentityLines(lines.slice(0, Math.min(3, index + 1)));
      if (identity.name || identity.targetRole) {
        doc.identity = identity;
      }
    }

    if (isContactLine(line)) {
      doc.contactLines.push(line);
      doc.diagnostics.ignoredLineCount += 1;
      continue;
    }
    if (isLinkLine(line)) {
      doc.linkLines.push(line);
      doc.diagnostics.ignoredLineCount += 1;
      continue;
    }

    switch (currentSection) {
      case "summary": {
        if (!isInvalidFragment(line)) {
          summaryLines.push(line);
        }
        break;
      }
      case "experience": {
        if (doc.experiences.length >= MAX_EXPERIENCES) {
          truncated = true;
          break;
        }
        if (isProfessionalBulletLine(line)) {
          if (!experienceDraft) {
            experienceDraft = { bullets: [], headerLines: [] };
          } else if (experienceDraft.headerLines.length > 0) {
            applyExperienceHeaderLines(experienceDraft, experienceDraft.headerLines);
            experienceDraft.headerLines = [];
          }
          pushBullet(experienceDraft, line);
          break;
        }
        if (isExperienceHeader(line)) {
          flushExperienceDraft(experienceDraft, doc.experiences);
          experienceDraft = { bullets: [], headerLines: [] };
          const parsed = parseExperienceHeader(line);
          experienceDraft.company = parsed?.company;
          experienceDraft.title = parsed?.title;
          experienceDraft.period = parsed?.period;
          break;
        }
        if (looksLikePeriodOnly(line) || looksLikeStandaloneCompany(line) || looksLikeProfessionalTitle(line)) {
          if (
            experienceDraft &&
            experienceDraft.bullets.length > 0 &&
            (looksLikeStandaloneCompany(line) || looksLikeProfessionalTitle(line))
          ) {
            if (experienceDraft.headerLines.length > 0) {
              applyExperienceHeaderLines(experienceDraft, experienceDraft.headerLines);
              experienceDraft.headerLines = [];
            }
            flushExperienceDraft(experienceDraft, doc.experiences);
            experienceDraft = { bullets: [], headerLines: [line] };
            break;
          }
          if (!experienceDraft) {
            experienceDraft = { bullets: [], headerLines: [] };
          }
          experienceDraft.headerLines.push(line);
          if (experienceDraft.headerLines.length >= 3) {
            applyExperienceHeaderLines(experienceDraft, experienceDraft.headerLines);
            experienceDraft.headerLines = [];
          }
          break;
        }
        if (isSkillTokenLine(line)) {
          addUniqueSkills(doc.skills, splitSkillTokens(line));
          break;
        }
        doc.unclassifiedLines.push(line);
        break;
      }
      case "projects": {
        if (STACK_LINE_PATTERN.test(line)) {
          if (!projectDraft) {
            projectDraft = { stack: [], bullets: [] };
          }
          addUniqueSkills(projectDraft.stack, splitSkillTokens(line.replace(/^stack\s*:/i, "")));
          break;
        }
        if (isProfessionalBulletLine(line)) {
          if (!projectDraft) {
            projectDraft = { stack: [], bullets: [] };
          }
          projectDraft.bullets.push(line);
          break;
        }
        if (!projectDraft) {
          projectDraft = { name: line, stack: [], bullets: [] };
          break;
        }
        if (!projectDraft.description && !projectDraft.bullets.length) {
          projectDraft.description = line;
          break;
        }
        if (projectDraft.name || projectDraft.description || projectDraft.bullets.length > 0) {
          doc.projects.push({
            name: projectDraft.name,
            description: projectDraft.description,
            stack: projectDraft.stack,
            bullets: projectDraft.bullets,
          });
          projectDraft = { name: line, stack: [], bullets: [] };
        }
        break;
      }
      case "skills": {
        addUniqueSkills(doc.skills, splitSkillTokens(line));
        if (doc.skills.length === 0) {
          addUniqueSkills(doc.skills, splitSkillTokens(line.replace(/^compet[eê]ncias(?:\s+t[eé]cnicas)?\s*/i, "")));
        }
        break;
      }
      case "education": {
        if (/\b(curso|certifica)\b/i.test(line)) {
          doc.certifications.push(line);
        } else {
          doc.education.push(line);
        }
        break;
      }
      case "certifications": {
        doc.certifications.push(line);
        break;
      }
      case "languages": {
        if (isLanguageLine(line)) {
          doc.languages.push(line);
        } else {
          doc.diagnostics.ignoredLineCount += 1;
        }
        break;
      }
      case "contact": {
        doc.contactLines.push(line);
        doc.diagnostics.ignoredLineCount += 1;
        break;
      }
      case "links": {
        doc.linkLines.push(line);
        doc.diagnostics.ignoredLineCount += 1;
        break;
      }
      default: {
        if (
          !doc.summary &&
          line.length >= 25 &&
          /\b(experi[eê]ncia|produtos|desenvolv|automa)\b/i.test(line) &&
          !isSectionHeading(line)
        ) {
          doc.summary = line;
          break;
        }
        if (isSkillTokenLine(line)) {
          addUniqueSkills(doc.skills, splitSkillTokens(line));
          break;
        }
        if (isProfessionalBulletLine(line)) {
          currentSection = "experience";
          if (!experienceDraft) {
            experienceDraft = { bullets: [], headerLines: [] };
          }
          pushBullet(experienceDraft, line);
          break;
        }
        if (isExperienceHeader(line) || looksLikeStandaloneCompany(line) || looksLikeProfessionalTitle(line)) {
          currentSection = "experience";
          if (!experienceDraft) {
            experienceDraft = { bullets: [], headerLines: [] };
          }
          if (isExperienceHeader(line)) {
            flushExperienceDraft(experienceDraft, doc.experiences);
            experienceDraft = { bullets: [], headerLines: [] };
            const parsed = parseExperienceHeader(line);
            experienceDraft.company = parsed?.company;
            experienceDraft.title = parsed?.title;
            experienceDraft.period = parsed?.period;
          } else {
            experienceDraft.headerLines.push(line);
          }
          break;
        }
        if (isEducationLine(line)) {
          doc.education.push(line);
          break;
        }
        if (isLanguageLine(line)) {
          doc.languages.push(line);
          break;
        }
        doc.unclassifiedLines.push(line);
      }
    }
  }

  flushExperienceDraft(experienceDraft, doc.experiences);
  if (projectDraft && (projectDraft.name || projectDraft.description || projectDraft.bullets.length > 0)) {
    doc.projects.push(projectDraft);
  }

  if (summaryLines.length > 0) {
    doc.summary = summaryLines.join(" ").slice(0, 500);
  }

  if (!doc.identity?.name && !doc.identity?.targetRole) {
    doc.identity = parseIdentityLines(lines.slice(0, 3));
  }

  doc.experiences = doc.experiences.slice(0, MAX_EXPERIENCES);
  doc.projects = doc.projects.slice(0, MAX_PROJECTS);
  doc.skills = doc.skills.slice(0, MAX_SKILLS);

  doc.diagnostics.experienceCount = doc.experiences.length;
  doc.diagnostics.projectCount = doc.projects.length;
  doc.diagnostics.bulletCount = doc.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0);
  doc.diagnostics.skillCount = doc.skills.length;
  doc.diagnostics.unclassifiedLineCount = doc.unclassifiedLines.length;
  doc.diagnostics.truncated = truncated;
  doc.confidence = computeConfidence(doc);

  return doc;
}

export function mapParsedResumeToLineExperiences(doc: ParsedResumeDocument): LineParsedExperience[] {
  return doc.experiences.map((experience) => ({
    company: experience.company?.trim() || "—",
    title: experience.title?.trim() || "—",
    period: experience.period,
    bullets: experience.bullets,
  }));
}

export function mapParsedResumeToProjects(doc: ParsedResumeDocument): Array<{ name: string; bullets: string[] }> {
  return doc.projects
    .map((project) => {
      const bullets = [...project.bullets];
      if (project.description && bullets.length === 0) {
        bullets.push(project.description);
      }
      return {
        name: project.name?.trim() || "Projeto",
        bullets,
      };
    })
    .filter((project) => project.bullets.length > 0);
}

export function extractResumeBulletsFromDocument(doc: ParsedResumeDocument): string[] {
  return doc.experiences.flatMap((experience) => experience.bullets);
}

export function buildParticipantParseSummary(doc: ParsedResumeDocument): string {
  const parts: string[] = [];
  if (doc.experiences.length > 0) {
    parts.push(`${doc.experiences.length} experiência${doc.experiences.length > 1 ? "s" : ""}`);
  }
  if (doc.projects.length > 0) {
    parts.push(`${doc.projects.length} projeto${doc.projects.length > 1 ? "s" : ""}`);
  }
  if (doc.skills.length > 0) {
    parts.push(`${doc.skills.length} competência${doc.skills.length > 1 ? "s" : ""}`);
  }
  if (parts.length === 0) {
    return "";
  }
  return `Foram identificadas ${parts.join(", ")}.`;
}
