import type { ApplyflowSkillKey } from "./profile-schema.js";
import { APPLYFLOW_SKILL_KEYS, type CandidateProfile, validateCandidateProfile } from "./profile-schema.js";

const gustavoSkillYears: Record<ApplyflowSkillKey, number> = {
  React: 5,
  Nextjs: 5,
  TypeScript: 5,
  Nodejs: 5,
  Python: 4,
  PostgreSQL: 4,
  Prisma: 3,
  Docker: 3,
  Jest: 3,
  Playwright: 2,
  Tailwind: 4,
  AWS: 1,
  Java: 1,
  Elixir: 0,
  Ruby: 0,
  WordPress: 3,
  HTML: 5,
  CSS: 5,
  Git: 5,
  CI_CD: 4,
};

/** Perfil inicial — valores profissionais de referência (sem dados sensíveis). */
const gustavoDraft = {
  name: "Gustavo Marques",
  location: "Brazil",
  englishLevel: "Advanced" as const,
  comfortableInEnglish: true,
  roles: [
    "Senior Frontend Engineer",
    "Senior Full-Stack Engineer",
    "Product Engineer",
    "React / Next.js Developer",
    "SaaS Engineer",
  ],
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
    usdMonthly: "USD 4,500/month as contractor",
    usdHourly: "USD 40/hour as contractor",
  },
};

export const gustavoProfile: CandidateProfile = validateCandidateProfile(gustavoDraft);

/** @deprecated Use `gustavoProfile`; mantido para compatibilidade. */
export const CANDIDATE_PROFILE = gustavoProfile;
