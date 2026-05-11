import type { FieldClassification } from "./types.js";
import { normalizeLinkedInLabel } from "./normalize-label.js";

function norm(s: string): string {
  return normalizeLinkedInLabel(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Ordem: padrões mais específicos primeiro. */
const COVER_LETTER: RegExp[] = [/cover\s*letter/, /carta\s+de\s+apresentacao/];

const SALARY: RegExp[] = [
  /\bsalary\b/,
  /\bcompensation\b/,
  /\bexpected\s+compensation\b/,
  /\bsalary\s+expectation\b/,
  /\bpretens(ao|ão)\s+salar(ial)?\b/i,
  /expectativa\s+salar(ial)?\b/i,
];

const LOCATION_BR: RegExp[] = [
  /mora\s+no\s+brasil/,
  /reside\s+no\s+brasil/,
  /live\s+in\s+brazil/,
  /atualmente.*mora.*brasil/,
  /^voce\s+mora\s+no\s+brasil/,
];

const ENGLISH: RegExp[] = [
  /\bwhat\s+is\s+your\s+english\s+proficiency\b/,
  /\benglish\s+proficiency\b/,
  /(proficiency|level|fluen).*english/,
  /english.*(proficiency|level|fluen|comfortable)/,
  /\bnivel\s+de\s+ingles\b/,
  /qual\s+seu\s+nivel\s+de\s+ingles/,
  /proficienc.*ingles/,
];

const YES_NO_HINTS: RegExp[] = [/^(do you|are you|have you)\b/, /^(voce\s+|você\s+)/];

function matchSkill(normLabel: string): { skill: string } | null {
  const pairs: [RegExp, string][] = [
    [/next\.?\s*js|nextjs/, "nextjs"],
    [/node\.?\s*js|nodejs|\bnode\b/, "nodejs"],
    [/\breact\b/, "react"],
    [/typescript/, "typescript"],
    [/\baws\b/, "aws"],
    [/\bjava\b/, "java"],
    [/\belixir\b/, "elixir"],
  ];
  for (const [re, skill] of pairs) {
    if (re.test(normLabel)) return { skill };
  }
  return null;
}

export function looksLikeYearsExperienceLabel(normLabel: string): boolean {
  return (
    /(\byears?\b|\banos?\b|\bhow many\b|\bha\s+quantos\b|\bha\s+quanto\b|\bquantos\s+anos\b)/.test(normLabel) &&
    /(experience|experiencia|anos|years|usa|usando|using|with|com|em|tem|trabalhando)/.test(normLabel)
  );
}

export function classifyLinkedInField(label: string): FieldClassification {
  const n = norm(label);

  if (COVER_LETTER.some((re) => re.test(n))) {
    return { type: "cover_letter", confidence: "high" };
  }

  if (SALARY.some((re) => re.test(n))) {
    return { type: "salary", confidence: "high" };
  }

  if (LOCATION_BR.some((re) => re.test(n))) {
    return { type: "location", confidence: "high" };
  }

  if (ENGLISH.some((re) => re.test(n))) {
    return { type: "english", confidence: "high" };
  }

  const sk = matchSkill(n);
  if (sk && looksLikeYearsExperienceLabel(n)) {
    return { type: "years_experience", skill: sk.skill, confidence: "high" };
  }

  if (YES_NO_HINTS.some((re) => re.test(n)) && !(looksLikeYearsExperienceLabel(n) && sk)) {
    return { type: "yes_no", confidence: "medium" };
  }

  if (looksLikeYearsExperienceLabel(n) && sk) {
    return { type: "years_experience", skill: sk.skill, confidence: "medium" };
  }

  return { type: "unknown", confidence: "low" };
}
