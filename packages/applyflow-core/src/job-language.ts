import { CURRICULUM_ROUTER_DELTA_BANDS_V1, type ResumeMatchCandidate } from "./job-match-types.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { ResumeLibrary, ResumeVariant } from "./resume-library-types.js";

export const RESUME_LANGUAGES = ["pt-BR", "en", "unknown"] as const;
export type ResumeLanguage = (typeof RESUME_LANGUAGES)[number];

export type ResumeLanguageRoute = {
  variantId: string;
  jobLanguage: ResumeLanguage;
  resumeLanguage: ResumeLanguage;
  reason: string;
  requiresConfirmation: boolean;
};

const PT_MARKERS = [
  "buscamos",
  "buscando",
  "vaga",
  "desenvolvedor",
  "desenvolvedora",
  "atuacao",
  "atuar",
  "experiencia",
  "requisitos",
  "desejavel",
  "contratacao",
  "salario",
  "nossos",
  "nossas",
  "voce",
  "equipe",
  "pessoa",
  "oportunidade",
  "diferenciais",
  "beneficios",
  "conhecimentos",
  "formacao",
  "atividades",
  "presencial",
] as const;

const EN_CONTENT = [
  "we",
  "our",
  "looking",
  "build",
  "maintain",
  "team",
  "role",
  "requirements",
  "responsibilities",
  "qualifications",
  "experience",
  "about",
  "join",
] as const;

const EN_FUNCTION = ["you", "your", "the", "and", "to", "for", "with", "this", "will"] as const;

export function classifyJobLanguage(text: string | undefined): ResumeLanguage {
  const folded = normalizeJobTextForIntel(text ?? "");
  if (!folded) return "unknown";
  if (/\b(?:language|idioma|application language)\s*:\s*(?:english|ingles)\b/.test(folded)) return "en";
  if (/\b(?:language|idioma|application language)\s*:\s*(?:portuguese|portugues|pt-br|ptbr)\b/.test(folded)) {
    return "pt-BR";
  }
  const pt = countMarkers(folded, PT_MARKERS);
  const enContent = countMarkers(folded, EN_CONTENT);
  const enFunction = countMarkers(folded, EN_FUNCTION);
  const en = enContent + (enContent > 0 ? enFunction : 0);
  if (pt < 3 && en < 3) return "unknown";
  if (pt >= en + 2 && pt >= 3) return "pt-BR";
  if (en >= pt + 2 && en >= 3 && (pt === 0 ? enContent >= 1 : enContent >= 2)) return "en";
  return "unknown";
}

export function classifyResumeLanguage(variant: Pick<ResumeVariant, "name" | "profile">): ResumeLanguage {
  const name = normalizeJobTextForIntel(variant.name);
  if (/\bpt-br\b|\bptbr\b|\bportugues\b|\bportuguese\b/.test(name)) return "pt-BR";
  if (/\ben\b|\benglish\b|\bingles\b/.test(name)) return "en";
  const sample = [
    variant.profile.answerBank.tellUsAboutYourself,
    variant.profile.answerBank.professionalSummary,
    variant.profile.answerBank.whyGoodFit,
  ].join(" ");
  return classifyJobLanguage(sample);
}

export function routeResumeLanguage(input: {
  library: ResumeLibrary;
  candidates: readonly ResumeMatchCandidate[];
  jobText?: string;
  rank?: (candidates: readonly ResumeMatchCandidate[]) => ResumeMatchCandidate[];
}): ResumeLanguageRoute {
  const top = input.candidates[0];
  if (!top) {
    const fallback = input.library.variants.find((item) => item.id === input.library.defaultVariantId) ?? input.library.variants[0];
    return {
      variantId: fallback?.id ?? input.library.defaultVariantId,
      jobLanguage: "unknown",
      resumeLanguage: fallback ? classifyResumeLanguage(fallback) : "unknown",
      reason: "No resume candidate was ranked.",
      requiresConfirmation: true,
    };
  }
  const jobLanguage = classifyJobLanguage(input.jobText);
  const topVariant = variantById(input.library, top.variantId);
  if (jobLanguage === "unknown") {
    return {
      variantId: top.variantId,
      jobLanguage,
      resumeLanguage: topVariant ? classifyResumeLanguage(topVariant) : "unknown",
      reason: "Job language was not established. Kept the technical ranking and the existing tie-break.",
      requiresConfirmation: false,
    };
  }
  const matches = input.candidates.filter((candidate) => {
    const variant = variantById(input.library, candidate.variantId);
    return variant ? classifyResumeLanguage(variant) === jobLanguage : false;
  });
  if (matches.length === 0) {
    return {
      variantId: top.variantId,
      jobLanguage,
      resumeLanguage: topVariant ? classifyResumeLanguage(topVariant) : "unknown",
      reason: `No ${jobLanguage} resume is available. Kept the current fallback and did not invent a variant.`,
      requiresConfirmation: true,
    };
  }
  const bestMatch = (input.rank ? input.rank(matches) : matches)[0];
  if (!bestMatch) {
    return {
      variantId: top.variantId,
      jobLanguage,
      resumeLanguage: topVariant ? classifyResumeLanguage(topVariant) : "unknown",
      reason: "Job language was not established. Kept the technical ranking and the existing tie-break.",
      requiresConfirmation: false,
    };
  }
  if (top.score - bestMatch.score >= CURRICULUM_ROUTER_DELTA_BANDS_V1.clear && top.variantId !== bestMatch.variantId) {
    return {
      variantId: top.variantId,
      jobLanguage,
      resumeLanguage: topVariant ? classifyResumeLanguage(topVariant) : "unknown",
      reason: `Technical fit favors ${top.variantName}. The ${jobLanguage} resume is available but is not close enough to replace it.`,
      requiresConfirmation: true,
    };
  }
  const selected = variantById(input.library, bestMatch.variantId);
  return {
    variantId: bestMatch.variantId,
    jobLanguage,
    resumeLanguage: selected ? classifyResumeLanguage(selected) : jobLanguage,
    reason: `Selected the ${jobLanguage} resume. Technical fit is comparable and the posting language matches that variant.`,
    requiresConfirmation: false,
  };
}

export function resumeLanguageOfProfile(profile: CandidateProfile, name = ""): ResumeLanguage {
  return classifyResumeLanguage({ name, profile });
}

function variantById(library: ResumeLibrary, id: string): ResumeVariant | undefined {
  return library.variants.find((item) => item.id === id);
}

function countMarkers(folded: string, markers: readonly string[]): number {
  let count = 0;
  for (const marker of markers) {
    if (new RegExp(`\\b${marker}\\b`).test(folded)) count += 1;
  }
  return count;
}
