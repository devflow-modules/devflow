import type { JobAnalysisInput } from "../job-analysis/types.js";

export const sampleJobInput: JobAnalysisInput = {
  title: "Senior Frontend Engineer",
  company: "Acme SaaS",
  description: `
We are hiring a Senior Frontend Engineer to build our B2B SaaS dashboard.

Requirements:
- React and Next.js
- TypeScript
- Tailwind CSS
- Jest and Playwright for testing

Nice to have:
- Node.js and GraphQL experience
- Docker and GitHub Actions
`.trim(),
};

export const sampleSeniorFrontendJob: JobAnalysisInput = {
  title: "Senior Frontend Engineer",
  company: "NovaCRM",
  description: `
NovaCRM is a B2B SaaS CRM platform. We need a Senior Frontend Engineer (presencial, inglês fluente).

Requisitos:
- React, Next.js e TypeScript
- Tailwind CSS e Chakra UI
- Jest e Playwright
- Experiência com dashboards e analytics

Diferenciais:
- Framer Motion
- GraphQL
- GitHub Actions
`.trim(),
};

export const sampleFullstackSaasJob: JobAnalysisInput = {
  title: "Pleno Fullstack Engineer — SaaS",
  company: "FinHealth",
  description: `
FinHealth is a fintech health automation startup building AI-assisted workflows.

Must have:
- Node.js, Express, REST API
- React, Next.js, TypeScript
- Prisma, PostgreSQL
- JWT auth and OAuth2
- Docker

Nice to have:
- OpenAI integrations
- Playwright
- SaaS billing experience
- Comunicação and ownership in cross-functional teams

PJ obrigatório. Disponibilidade imediata.
`.trim(),
};
