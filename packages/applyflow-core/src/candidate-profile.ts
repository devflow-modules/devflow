import type { ApplyflowSkillKey } from "./profile-schema.js";
import { APPLYFLOW_SKILL_KEYS, type CandidateProfile, validateCandidateProfile } from "./profile-schema.js";

const gustavoSkillYears: Record<ApplyflowSkillKey, number> = {
  React: 5,
  Nextjs: 4,
  TypeScript: 5,
  Nodejs: 5,
  Python: 4,
  PostgreSQL: 4,
  Prisma: 3,
  Docker: 3,
  Jest: 3,
  Playwright: 2,
  Tailwind: 3,
  AWS: 1,
  Java: 1,
  Elixir: 0,
  Ruby: 0,
  WordPress: 3,
  HTML: 5,
  CSS: 5,
  Git: 5,
  CI_CD: 3,
};

/** Perfil inicial — valores profissionais de referência (sem dados sensíveis). */
const gustavoDraft = {
  name: "Gustavo Marques",
  location: "Brazil",
  englishLevel: "Advanced" as const,
  comfortableInEnglish: true,
  roles: ["Senior Software Engineer", "Full-stack (Web)", "Technical leadership"],
  skills: APPLYFLOW_SKILL_KEYS.reduce(
    (acc, k) => {
      acc[k] = gustavoSkillYears[k];
      return acc;
    },
    {} as Record<string, number>,
  ),
  salary: {
    cltPleno: "R$ 10.000 CLT",
    cltSenior: "R$ 14.500 CLT",
    pjSenior: "R$ 17.500 PJ",
    usdMonthly: "USD 4,500/month",
    usdHourly: "USD 40/hour",
  },
};

export const gustavoProfile: CandidateProfile = validateCandidateProfile(gustavoDraft);

/** @deprecated Use `gustavoProfile`; mantido para compatibilidade. */
export const CANDIDATE_PROFILE = gustavoProfile;
