import type { ApplyflowSkillKey } from "./profile-schema.js";
import { APPLYFLOW_SKILL_KEYS, type CandidateProfile, validateCandidateProfile } from "./profile-schema.js";

const gustavoSkillYears: Record<ApplyflowSkillKey, number> = {
  React: 5,
  Nextjs: 5,
  TypeScript: 5,
  Nodejs: 5,
  Python: 4,
  PostgreSQL: 4,
  Prisma: 4,
  Docker: 3,
  Jest: 3,
  Playwright: 3,
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

const gustavoAnswerBank = {
  professionalSummary: `I am a Senior Frontend / Full-Stack Software Engineer with 5+ years of experience building production web applications, SaaS platforms, dashboards, admin panels, and API-driven product flows.

My strongest stack includes React, Next.js, TypeScript, Node.js, PostgreSQL, Prisma, Tailwind CSS, automated testing, CI/CD, and product-oriented frontend architecture.

I currently work with automation, systems integration, and real operational workflows, combining Python, Node.js, APIs, RPA, and product engineering. I am also the founder of DevFlow Labs, where I build SaaS products, automation tools, WhatsApp-based operational systems, dashboards, and internal platforms focused on productivity and business efficiency.

I have hands-on experience launching full products from concept to deployment, including Investiga+, a SaaS platform for company intelligence and CNPJ analysis, and DevFlow Labs products involving WhatsApp automation, multi-tenant dashboards, billing foundations, and operational workflows.

I combine strong technical execution, product ownership, UI/UX awareness, and the ability to deliver complete solutions end-to-end.`,

  tellUsAboutYourself: `I am a Senior Frontend / Full-Stack Software Engineer focused on React, Next.js, TypeScript, SaaS products, automation, and API integrations.

I have experience building production web applications, dashboards, admin panels, secure authentication flows, backend integrations, and operational tools. I currently work with automation and systems integration, and I also build products through DevFlow Labs, including SaaS platforms, WhatsApp automation tools, and internal business systems.

I enjoy working on products where I can combine technical execution, product thinking, performance, clean UI, and end-to-end ownership.`,

  whyGoodFit: `I believe I am a strong fit because I combine senior frontend experience with full-stack and product ownership.

I have built production applications with React, Next.js, TypeScript, Node.js, PostgreSQL, Prisma, authentication, APIs, testing, CI/CD, and responsive UI. I am comfortable working across the full product lifecycle, from understanding the business problem to implementing, testing, deploying, and iterating.

My background also includes automation and systems integration, which helps me think beyond the interface and understand how software impacts real operations.`,

  availability: `I am available for remote opportunities and can work with international teams. I am comfortable communicating in English for technical discussions, documentation, async updates, and product collaboration.`,
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
  answerBank: gustavoAnswerBank,
};

export const gustavoProfile: CandidateProfile = validateCandidateProfile(gustavoDraft);

/** @deprecated Use `gustavoProfile`; mantido para compatibilidade. */
export const CANDIDATE_PROFILE = gustavoProfile;
