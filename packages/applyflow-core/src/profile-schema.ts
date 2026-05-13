import { z } from "zod";

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

const ENGLISH_LEVELS = ["Basic", "Intermediate", "Advanced", "Fluent"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

/** Textos longos reutilizáveis para perguntas abertas do Easy Apply (local-first). */
export type AnswerBank = {
  professionalSummary: string;
  tellUsAboutYourself: string;
  whyGoodFit: string;
  availability: string;
};

export const EMPTY_ANSWER_BANK: AnswerBank = {
  professionalSummary: "",
  tellUsAboutYourself: "",
  whyGoodFit: "",
  availability: "",
};

export function normalizeAnswerBank(raw: Partial<AnswerBank> | undefined | null): AnswerBank {
  if (raw == null) return { ...EMPTY_ANSWER_BANK };
  return {
    professionalSummary: (raw.professionalSummary ?? "").trim(),
    tellUsAboutYourself: (raw.tellUsAboutYourself ?? "").trim(),
    whyGoodFit: (raw.whyGoodFit ?? "").trim(),
    availability: (raw.availability ?? "").trim(),
  };
}

export type CandidateProfile = {
  name: string;
  location: string;
  englishLevel: EnglishLevel;
  comfortableInEnglish: boolean;
  roles: string[];
  skills: Record<ApplyflowSkillKey, number>;
  salary: {
    cltPleno: string;
    cltSenior: string;
    pjSenior: string;
    usdMonthly: string;
    usdHourly: string;
  };
  answerBank: AnswerBank;
};

const SKILL_ZERO: Record<ApplyflowSkillKey, number> = Object.fromEntries(
  APPLYFLOW_SKILL_KEYS.map((k) => [k, 0]),
) as Record<ApplyflowSkillKey, number>;

/** Mapeia entradas livres (ex.: import JSON) para chave canónica. */
export function resolveSkillCanonicalKey(raw: string): ApplyflowSkillKey | null {
  const compact = raw.trim().toLowerCase().replace(/\s+/g, "");
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

function mergeSkillsRecord(input: Record<string, number>): Record<ApplyflowSkillKey, number> {
  const out = { ...SKILL_ZERO };
  for (const [rawKey, val] of Object.entries(input)) {
    const key = resolveSkillCanonicalKey(rawKey);
    if (key && typeof val === "number" && Number.isFinite(val)) {
      out[key] = Math.min(80, Math.max(0, Math.round(val)));
    }
  }
  return out;
}

const salaryShape = {
  cltPleno: z.string().trim().min(1).max(400),
  cltSenior: z.string().trim().min(1).max(400),
  pjSenior: z.string().trim().min(1).max(400),
  usdMonthly: z.string().trim().min(1).max(400),
  usdHourly: z.string().trim().min(1).max(400),
};

const answerBankShape = {
  professionalSummary: z.string().max(5000).optional(),
  tellUsAboutYourself: z.string().max(2500).optional(),
  whyGoodFit: z.string().max(2500).optional(),
  availability: z.string().max(1200).optional(),
};

export const candidateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    location: z.string().trim().min(1).max(200),
    englishLevel: z.enum(ENGLISH_LEVELS),
    comfortableInEnglish: z.boolean(),
    roles: z.array(z.string().trim().max(200)).max(30),
    skills: z.record(z.string(), z.number().int().min(0).max(80)),
    salary: z.object(salaryShape),
    answerBank: z.object(answerBankShape).nullish(),
  })
  .transform((data) => {
    const { answerBank: rawBank, roles, skills, ...rest } = data;
    return {
      ...rest,
      roles: roles.map((r) => r.trim()).filter(Boolean),
      skills: mergeSkillsRecord(skills),
      answerBank: normalizeAnswerBank(rawBank),
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
