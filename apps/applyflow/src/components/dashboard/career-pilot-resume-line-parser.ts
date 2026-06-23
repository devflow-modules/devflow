import { __resumeAnalystTestUtils } from "../../../../../packages/career-core/src/career-agents/agents/resume-analyst";

export type ResumeLineKind =
  | "section_heading"
  | "identity_role"
  | "experience_header"
  | "bullet"
  | "skill_line"
  | "summary"
  | "unknown";

export type ParsedExperienceHeader = {
  company?: string;
  title?: string;
  period?: string;
};

export type ParsedResumeExperience = {
  title: string;
  company: string;
  period?: string;
  bullets: string[];
};

const SECTION_HEADER_PATTERN =
  /^(experi[eê]ncia(\s+profissional)?|form[aã]o(\s+acad[eê]mica)?|compet[eê]ncias|competencias|habilidades|skills|education|experience|projects?|projetos?|certifica[cç][oõ]es|idiomas|resumo( profissional)?|summary|work history|employment)$/i;

const SKILL_LINE_PATTERN = /^(compet[eê]ncias|competencias|habilidades|skills)\s*:/i;

const IDENTITY_LINE_PATTERN = /^([\p{L}\s.'-]+)\s*[—–-]\s*([\p{L}\s.'-]+)$/u;

const PROFESSIONAL_TITLE_PATTERN =
  /\b(desenvolvedor|desenvolvedora|engenheir|analista|designer|gerente|coordenador|consultor|arquiteto|software|backend|frontend|full[\s-]?stack|sênior|senior|pleno|júnior|junior)\b/i;

const PERIOD_IN_PARENS_PATTERN =
  /[\(（]\s*((?:19|20)\d{2}\s*[–\-—]\s*(?:presente|atual|até o momento|(19|20)\d{2}))\s*[\)）]/iu;

const YEAR_RANGE_PATTERN =
  /\b(19|20)\d{2}\s*[–\-—]\s*(?:presente|atual|até o momento|(19|20)\d{2})\b/i;

const MONTH_YEAR_RANGE_PATTERN =
  /\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[./]?\d{2,4}\s*(?:a|até|–|-)\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[./]?\d{2,4}\b/i;

const HEADER_SEPARATOR_PATTERN = /\s*(?:[—–|]|\-)\s*/;

const { startsWithActionVerb } = __resumeAnalystTestUtils;

function cleanLine(line: string): string {
  return line.replace(/^[\s•\-*]+/, "").trim();
}

function isSectionHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 60 || startsWithActionVerb(trimmed)) {
    return false;
  }
  return SECTION_HEADER_PATTERN.test(trimmed);
}

function isSkillListLine(line: string): boolean {
  return SKILL_LINE_PATTERN.test(line.trim());
}

function looksLikePersonName(text: string): boolean {
  const trimmed = text.trim();
  if (
    /\b(empresa|corp|corporation|ltd|inc|tech|s\.?a\.?|group|labs|consulting|solutions)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (/\d|[\(（]/.test(trimmed)) {
    return false;
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) {
    return false;
  }
  return words.every((word) => /^[\p{L}.'-]+$/u.test(word));
}

function parseIdentityLine(line: string): { name: string; role: string } | null {
  const match = line.trim().match(IDENTITY_LINE_PATTERN);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const name = match[1].trim();
  const role = match[2].trim();
  if (!looksLikePersonName(name) || !looksLikeRole(role) || extractPeriod(line)) {
    return null;
  }
  return { name, role };
}

function extractPeriod(text: string): string | undefined {
  const paren = text.match(PERIOD_IN_PARENS_PATTERN);
  if (paren?.[1]) {
    return paren[1].trim();
  }
  const range = text.match(YEAR_RANGE_PATTERN);
  if (range?.[0]) {
    return range[0].trim();
  }
  const monthRange = text.match(MONTH_YEAR_RANGE_PATTERN);
  if (monthRange?.[0]) {
    return monthRange[0].trim();
  }
  return undefined;
}

function looksLikeRole(text: string): boolean {
  const trimmed = text.trim();
  return PROFESSIONAL_TITLE_PATTERN.test(trimmed) || /\b(de|da|do)\s+\p{L}/iu.test(trimmed);
}

function looksLikeCompany(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 80) {
    return false;
  }
  if (startsWithActionVerb(trimmed)) {
    return false;
  }
  return !/[.!?]$/.test(trimmed);
}

export function parseExperienceHeader(line: string): ParsedExperienceHeader | null {
  const trimmed = cleanLine(line);
  if (!trimmed || startsWithActionVerb(trimmed)) {
    return null;
  }

  const period = extractPeriod(trimmed);
  const withoutPeriod = trimmed
    .replace(PERIOD_IN_PARENS_PATTERN, "")
    .replace(YEAR_RANGE_PATTERN, "")
    .replace(MONTH_YEAR_RANGE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const parenRoleMatch = trimmed.match(
    /^(.+?)\s*[\(（]\s*((?:19|20)\d{2}\s*[–\-—]\s*(?:presente|atual|até o momento|(19|20)\d{2}))\s*[\)）]\s*[—–-]\s*(.+)$/iu,
  );
  if (parenRoleMatch?.[1] && parenRoleMatch[3]) {
    return {
      company: parenRoleMatch[1].trim(),
      title: parenRoleMatch[3].trim(),
      period: parenRoleMatch[2]?.trim() ?? period,
    };
  }

  const parts = withoutPeriod
    .split(HEADER_SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 2) {
    const [left, right] = parts;
    if (looksLikeRole(right) && looksLikeCompany(left)) {
      return { company: left, title: right, period };
    }
    if (looksLikeRole(left) && looksLikeCompany(right)) {
      return { company: right, title: left, period };
    }
    if (period) {
      return { company: left, title: right, period };
    }
  }

  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (extractPeriod(third)) {
      if (looksLikeRole(second)) {
        return { company: first, title: second, period: third };
      }
      return { company: second, title: first, period: third };
    }
    if (looksLikeRole(second)) {
      return { company: first, title: second, period: extractPeriod(third) ?? period };
    }
    return { company: second, title: first, period: extractPeriod(third) ?? period };
  }

  if (period && parts.length === 1 && looksLikeCompany(parts[0]!)) {
    return { company: parts[0], period };
  }

  return null;
}

export function isExperienceHeader(line: string): boolean {
  const trimmed = cleanLine(line);
  if (!trimmed || startsWithActionVerb(trimmed)) {
    return false;
  }
  if (isSectionHeaderLine(trimmed) || isSkillListLine(trimmed) || parseIdentityLine(trimmed)) {
    return false;
  }
  if (/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length >= 6) {
    return false;
  }

  const parsed = parseExperienceHeader(trimmed);
  if (parsed) {
    return Boolean(parsed.company || parsed.title || parsed.period);
  }

  return false;
}

export function classifyResumeLine(
  line: string,
  options?: { summaryToExclude?: string },
): ResumeLineKind {
  const trimmed = cleanLine(line);
  if (!trimmed) {
    return "unknown";
  }

  const summary = options?.summaryToExclude?.trim();
  if (summary && (trimmed.toLowerCase() === summary.toLowerCase() || summary.includes(trimmed))) {
    return "summary";
  }

  if (isSectionHeaderLine(trimmed)) {
    return "section_heading";
  }
  if (isSkillListLine(trimmed)) {
    return "skill_line";
  }
  if (parseIdentityLine(trimmed)) {
    return "identity_role";
  }
  if (startsWithActionVerb(trimmed)) {
    return "bullet";
  }
  if (isExperienceHeader(trimmed)) {
    return "experience_header";
  }
  if (/^(trabalhei|ajudei|participei|responsável|responsavel|atuei|conhecimento)\b/i.test(trimmed)) {
    return "bullet";
  }
  if (/[.!?]$/.test(trimmed)) {
    return "bullet";
  }

  return "unknown";
}

export function extractResumeExperiences(
  resumeText: string,
  summaryToExclude?: string,
): ParsedResumeExperience[] {
  const normalized = resumeText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const rawLines = normalized.split("\n").map(cleanLine).filter(Boolean);
  const hasStructuredSections = rawLines.some((line) => isSectionHeaderLine(line));
  let reachedBody = !hasStructuredSections;

  const experiences: ParsedResumeExperience[] = [];
  let current: ParsedResumeExperience | null = null;

  const pushCurrent = () => {
    if (current && (current.bullets.length > 0 || current.company !== "—" || current.title !== "—")) {
      experiences.push(current);
    }
    current = null;
  };

  for (const line of rawLines) {
    if (summaryToExclude && line.toLowerCase() === summaryToExclude.trim().toLowerCase()) {
      continue;
    }

    const kind = classifyResumeLine(line, { summaryToExclude });

    if (kind === "section_heading") {
      reachedBody = true;
      continue;
    }
    if (kind === "identity_role" || kind === "summary" || kind === "skill_line") {
      continue;
    }
    if (!reachedBody && hasStructuredSections) {
      continue;
    }

    if (kind === "experience_header") {
      pushCurrent();
      const parsed = parseExperienceHeader(line);
      current = {
        company: parsed?.company?.trim() || "—",
        title: parsed?.title?.trim() || "—",
        period: parsed?.period,
        bullets: [],
      };
      continue;
    }

    if (kind === "bullet" || kind === "unknown") {
      if (!current) {
        current = { company: "—", title: "—", bullets: [] };
      }
      current.bullets.push(line.slice(0, 500));
    }
  }

  pushCurrent();
  return experiences.slice(0, 50);
}

export function extractResumeBulletLines(resumeText: string, summaryToExclude?: string): string[] {
  return extractResumeExperiences(resumeText, summaryToExclude).flatMap((experience) => experience.bullets);
}
