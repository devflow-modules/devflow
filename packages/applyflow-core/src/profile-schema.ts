import { z } from "zod";

import type { Evidence } from "./evidence-types.js";
import { assertWritableRecordedFacts, parseRecordedFacts } from "./recorded-facts.js";

/** Chaves canónicas de skills (opções + JSON + motor de sugestões). */
export const APPLYFLOW_SKILL_KEYS = [
  "React",
  "Nextjs",
  "TypeScript",
  "Nodejs",
  "Python",
  "PostgreSQL",
  "Prisma",
  "Docker",
  "Jest",
  "Playwright",
  "Tailwind",
  "REST",
  "OpenAPI",
  "AWS",
  "Java",
  "Elixir",
  "Ruby",
  "WordPress",
  "HTML",
  "CSS",
  "Git",
  "CI_CD",
] as const;

export type ApplyflowSkillKey = (typeof APPLYFLOW_SKILL_KEYS)[number];

export const ENGLISH_LEVELS = ["Basic", "Intermediate", "Advanced", "Fluent"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export const REMOTE_PREFERENCES = ["remote", "hybrid", "onsite", "flexible"] as const;
export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

/**
 * Fatos objectivos. Ausência / `undefined` = unknown — nunca inventar anos nem URLs.
 * Não copiar automaticamente `skills.*` para estes campos na migração.
 */
export type CandidateFacts = {
  location?: string;
  totalYearsExperience?: number;
  cltYearsExperience?: number;
  reactYears?: number;
  nextYears?: number;
  nodeYears?: number;
  typescriptYears?: number;
  pythonYears?: number;
  englishLevel?: EnglishLevel;
  remotePreference?: RemotePreference;
  relocation?: boolean;
  availability?: string;
  linkedinUrl?: string;
  githubUrl?: string;
};

export const EMPTY_CANDIDATE_FACTS: CandidateFacts = {};

const FACT_YEAR_KEYS = [
  "totalYearsExperience",
  "cltYearsExperience",
  "reactYears",
  "nextYears",
  "nodeYears",
  "typescriptYears",
  "pythonYears",
] as const;

type FactYearKey = (typeof FACT_YEAR_KEYS)[number];

function optionalTrimmed(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

function optionalYear(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const n = Math.round(raw);
  if (n < 0 || n > 80) return undefined;
  return n;
}

function optionalUrl(raw: unknown): string | undefined {
  const t = optionalTrimmed(raw, 400);
  if (!t) return undefined;
  if (!/^https?:\/\//i.test(t)) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** Normaliza factos; campos em falta permanecem unknown (não há backfill a partir de skills). */
export function normalizeCandidateFacts(raw: Partial<CandidateFacts> | undefined | null): CandidateFacts {
  if (raw == null || typeof raw !== "object") return { ...EMPTY_CANDIDATE_FACTS };
  const out: CandidateFacts = {};
  const location = optionalTrimmed(raw.location, 200);
  if (location) out.location = location;
  for (const key of FACT_YEAR_KEYS) {
    const year = optionalYear(raw[key as FactYearKey]);
    if (year !== undefined) out[key] = year;
  }
  if (raw.englishLevel && (ENGLISH_LEVELS as readonly string[]).includes(raw.englishLevel)) {
    out.englishLevel = raw.englishLevel;
  }
  if (raw.remotePreference && (REMOTE_PREFERENCES as readonly string[]).includes(raw.remotePreference)) {
    out.remotePreference = raw.remotePreference;
  }
  if (typeof raw.relocation === "boolean") out.relocation = raw.relocation;
  const availability = optionalTrimmed(raw.availability, 400);
  if (availability) out.availability = availability;
  const linkedinUrl = optionalUrl(raw.linkedinUrl);
  if (linkedinUrl) out.linkedinUrl = linkedinUrl;
  const githubUrl = optionalUrl(raw.githubUrl);
  if (githubUrl) out.githubUrl = githubUrl;
  return out;
}

/** Textos longos reutilizáveis para perguntas abertas do Easy Apply (local-first). */
export type AnswerBank = {
  professionalSummary: string;
  tellUsAboutYourself: string;
  whyGoodFit: string;
  availability: string;
  hardestChallenge: string;
  productCase: string;
  frontendCase: string;
  backendCase: string;
  automationCase: string;
  leadershipCase: string;
};

/** Alias estável — Answer Bank evoluiu para incluir narrativas extra. */
export type NarrativeBank = AnswerBank;

export const EMPTY_ANSWER_BANK: AnswerBank = {
  professionalSummary: "",
  tellUsAboutYourself: "",
  whyGoodFit: "",
  availability: "",
  hardestChallenge: "",
  productCase: "",
  frontendCase: "",
  backendCase: "",
  automationCase: "",
  leadershipCase: "",
};

export function normalizeAnswerBank(raw: Partial<AnswerBank> | undefined | null): AnswerBank {
  if (raw == null) return { ...EMPTY_ANSWER_BANK };
  return {
    professionalSummary: (raw.professionalSummary ?? "").trim(),
    tellUsAboutYourself: (raw.tellUsAboutYourself ?? "").trim(),
    whyGoodFit: (raw.whyGoodFit ?? "").trim(),
    availability: (raw.availability ?? "").trim(),
    hardestChallenge: (raw.hardestChallenge ?? "").trim(),
    productCase: (raw.productCase ?? "").trim(),
    frontendCase: (raw.frontendCase ?? "").trim(),
    backendCase: (raw.backendCase ?? "").trim(),
    automationCase: (raw.automationCase ?? "").trim(),
    leadershipCase: (raw.leadershipCase ?? "").trim(),
  };
}

export const CANDIDATE_SALARY_KEYS = [
  "cltPleno",
  "cltSenior",
  "pjSenior",
  "usdMonthly",
  "usdHourly",
] as const;
export type CandidateSalaryKey = (typeof CANDIDATE_SALARY_KEYS)[number];

export type CandidateSalary = {
  cltPleno?: string;
  cltSenior?: string;
  pjSenior?: string;
  usdMonthly?: string;
  usdHourly?: string;
};

export const EMPTY_CANDIDATE_SALARY: CandidateSalary = {};

/**
 * Anos por skill:
 * - chave ausente → unknown (não informado)
 * - `null` → tecnologia conhecida, anos unknown
 * - `number` → anos explícitos, incluindo `0`
 */
export type SkillYearsValue = number | null;
export type CandidateSkills = Partial<Record<ApplyflowSkillKey, SkillYearsValue>>;

export type CandidateProfile = {
  name: string;
  location?: string;
  englishLevel?: EnglishLevel;
  comfortableInEnglish?: boolean;
  roles: string[];
  skills: CandidateSkills;
  salary: CandidateSalary;
  answerBank: AnswerBank;
  facts: CandidateFacts;
  /** Structured additional facts. Absence means none recorded — not a personal seed. */
  evidence?: Evidence[];
};

/** Mapeia entradas livres (ex.: import JSON) para chave canónica. */
export function resolveSkillCanonicalKey(raw: string): ApplyflowSkillKey | null {
  const compact = raw.trim().toLowerCase().replace(/[\s.]+/g, "");
  const aliases: Record<string, ApplyflowSkillKey> = {
    react: "React",
    nextjs: "Nextjs",
    next: "Nextjs",
    typescript: "TypeScript",
    ts: "TypeScript",
    nodejs: "Nodejs",
    node: "Nodejs",
    python: "Python",
    postgresql: "PostgreSQL",
    postgres: "PostgreSQL",
    prisma: "Prisma",
    docker: "Docker",
    jest: "Jest",
    playwright: "Playwright",
    tailwind: "Tailwind",
    tailwindcss: "Tailwind",
    rest: "REST",
    restapi: "REST",
    restful: "REST",
    openapi: "OpenAPI",
    swagger: "OpenAPI",
    swaggeropenapi: "OpenAPI",
    aws: "AWS",
    java: "Java",
    elixir: "Elixir",
    ruby: "Ruby",
    rails: "Ruby",
    wordpress: "WordPress",
    html: "HTML",
    css: "CSS",
    git: "Git",
    ci_cd: "CI_CD",
    cicd: "CI_CD",
    "ci/cd": "CI_CD",
    githubactions: "CI_CD",
  };

  if (aliases[compact]) return aliases[compact];
  const direct = APPLYFLOW_SKILL_KEYS.find((k) => k.toLowerCase() === compact);
  return direct ?? null;
}

function mergeSkillsRecord(input: Record<string, unknown>): CandidateSkills {
  const out: CandidateSkills = {};
  for (const [rawKey, val] of Object.entries(input)) {
    const key = resolveSkillCanonicalKey(rawKey);
    if (!key) continue;
    if (val === null) {
      out[key] = null;
      continue;
    }
    if (typeof val === "number" && Number.isFinite(val)) {
      out[key] = Math.min(80, Math.max(0, Math.round(val)));
    }
  }
  return out;
}

function normalizeSalary(raw: Partial<CandidateSalary> | null | undefined): CandidateSalary {
  if (raw == null || typeof raw !== "object") return { ...EMPTY_CANDIDATE_SALARY };
  const out: CandidateSalary = {};
  for (const key of CANDIDATE_SALARY_KEYS) {
    const value = optionalTrimmed(raw[key], 400);
    if (value) out[key] = value;
  }
  return out;
}

const optionalSalaryText = z.string().max(400).optional();

const salaryShape = {
  cltPleno: optionalSalaryText,
  cltSenior: optionalSalaryText,
  pjSenior: optionalSalaryText,
  usdMonthly: optionalSalaryText,
  usdHourly: optionalSalaryText,
};

const answerBankShape = {
  professionalSummary: z.string().max(5000).optional(),
  tellUsAboutYourself: z.string().max(2500).optional(),
  whyGoodFit: z.string().max(2500).optional(),
  availability: z.string().max(1200).optional(),
  hardestChallenge: z.string().max(2500).optional(),
  productCase: z.string().max(2500).optional(),
  frontendCase: z.string().max(2500).optional(),
  backendCase: z.string().max(2500).optional(),
  automationCase: z.string().max(2500).optional(),
  leadershipCase: z.string().max(2500).optional(),
};

const factsYear = z.number().int().min(0).max(80).optional();

const candidateFactsShape = {
  location: z.string().max(200).optional(),
  totalYearsExperience: factsYear,
  cltYearsExperience: factsYear,
  reactYears: factsYear,
  nextYears: factsYear,
  nodeYears: factsYear,
  typescriptYears: factsYear,
  pythonYears: factsYear,
  englishLevel: z.enum(ENGLISH_LEVELS).optional(),
  remotePreference: z.enum(REMOTE_PREFERENCES).optional(),
  relocation: z.boolean().optional(),
  availability: z.string().max(400).optional(),
  linkedinUrl: z.string().max(400).optional(),
  githubUrl: z.string().max(400).optional(),
};

const skillYearsValue = z.union([z.number().int().min(0).max(80), z.null()]);

export const candidateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    location: z.string().max(200).optional(),
    englishLevel: z.enum(ENGLISH_LEVELS).optional(),
    comfortableInEnglish: z.boolean().optional(),
    roles: z.array(z.string().trim().max(200)).max(30).optional().default([]),
    skills: z.record(z.string(), skillYearsValue).optional().default({}),
    salary: z.object(salaryShape).nullish(),
    answerBank: z.object(answerBankShape).nullish(),
    facts: z.object(candidateFactsShape).nullish(),
    evidence: z.array(z.unknown()).max(80).optional(),
  })
  .transform((data) => {
    const { answerBank: rawBank, facts: rawFacts, evidence: rawEvidence, roles, skills, salary, location, ...rest } = data;
    const trimmedLocation = optionalTrimmed(location, 200);
    const evidence = parseRecordedFacts(rawEvidence).facts;
    return {
      ...rest,
      ...(trimmedLocation ? { location: trimmedLocation } : {}),
      roles: roles.map((r) => r.trim()).filter(Boolean),
      skills: mergeSkillsRecord(skills),
      salary: normalizeSalary(salary),
      answerBank: normalizeAnswerBank(rawBank),
      facts: normalizeCandidateFacts(rawFacts),
      ...(evidence.length > 0 ? { evidence } : {}),
    };
  });

/**
 * Valida e normaliza um candidato a perfil (import JSON, storage, formulário).
 * Lança `Error` com mensagem legível se inválido.
 */
export function validateCandidateProfile(input: unknown): CandidateProfile {
  const parsed = candidateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(msg || "Perfil inválido");
  }
  return parsed.data;
}

/** Nome + cargo/área — mínimo para gravar um perfil útil na UI. */
export function validateSavableCandidateProfile(input: unknown): CandidateProfile {
  if (input && typeof input === "object" && "evidence" in input) {
    const rawEvidence = (input as { evidence?: unknown }).evidence;
    if (rawEvidence != null) {
      assertWritableRecordedFacts(rawEvidence);
    }
  }
  const profile = validateCandidateProfile(input);
  if (profile.roles.length === 0) {
    throw new Error("Indica um cargo ou área de interesse.");
  }
  return profile;
}

export function hasSkillKey(skills: CandidateSkills, key: ApplyflowSkillKey): boolean {
  return Object.prototype.hasOwnProperty.call(skills, key);
}

/** Tecnologia marcada no perfil, com ou sem anos. */
export function isSkillKnown(skills: CandidateSkills, key: ApplyflowSkillKey): boolean {
  return hasSkillKey(skills, key);
}

/** Tecnologia reivindicada (conhecida e não zero). */
export function isSkillClaimed(skills: CandidateSkills, key: ApplyflowSkillKey): boolean {
  if (!hasSkillKey(skills, key)) return false;
  const value = skills[key];
  return value === null || (typeof value === "number" && value > 0);
}

/** Anos explícitos. `null` e ausência são undefined. `0` permanece 0. */
export function declaredSkillYears(skills: CandidateSkills, key: ApplyflowSkillKey): number | undefined {
  if (!hasSkillKey(skills, key)) return undefined;
  const value = skills[key];
  return typeof value === "number" ? value : undefined;
}

export function profileLocation(profile: CandidateProfile): string | undefined {
  return optionalTrimmed(profile.facts.location ?? profile.location, 200);
}

export function profileEnglishLevel(profile: CandidateProfile): EnglishLevel | undefined {
  return profile.facts.englishLevel ?? profile.englishLevel;
}

export function salaryField(profile: CandidateProfile, key: CandidateSalaryKey): string | undefined {
  return optionalTrimmed(profile.salary[key], 400);
}

export function maxDeclaredYears(profile: CandidateProfile): number | undefined {
  if (typeof profile.facts.totalYearsExperience === "number") return profile.facts.totalYearsExperience;
  const years = APPLYFLOW_SKILL_KEYS.map((key) => declaredSkillYears(profile.skills, key)).filter(
    (value): value is number => value !== undefined,
  );
  if (years.length === 0) return undefined;
  return Math.max(...years);
}
