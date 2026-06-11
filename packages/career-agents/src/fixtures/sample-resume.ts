import type { ResumeAnalysisInput } from "../resume-analysis/types.js";

export const sampleResumeInput: ResumeAnalysisInput = {
  headline: "Frontend Engineer",
  summary: "Engineer focused on React and TypeScript product work.",
  experiences: [
    {
      title: "Senior Frontend Developer",
      company: "Example Corp",
      description:
        "Built customer dashboards with React, Next.js, and TypeScript. Introduced Playwright E2E coverage and Jest unit tests for critical flows.",
    },
  ],
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest"],
  projects: [
    {
      name: "Design system rollout",
      description: "Led component library adoption across three product squads.",
      stack: ["React", "TypeScript"],
    },
  ],
  education: ["B.S. Computer Science"],
};

export const sampleJuniorResume: ResumeAnalysisInput = {
  headline: "Desenvolvedor Júnior Frontend",
  summary: "Apaixonado por tecnologia.",
  experiences: [
    {
      title: "Estágio em Desenvolvimento",
      company: "Startup Local",
      description: "Apoio em telas com React.",
    },
  ],
  skills: ["react", "js", "html", "css", "tailwindcss"],
  education: ["Tecnólogo em Análise e Desenvolvimento de Sistemas"],
};

export const sampleSeniorProductEngineerResume: ResumeAnalysisInput = {
  headline: "Senior Product Engineer",
  summary:
    "Product-minded engineer shipping SaaS dashboards with measurable adoption gains (+18% activation).",
  experiences: [
    {
      title: "Senior Product Engineer",
      company: "MetricsFlow",
      description:
        "Owned analytics dashboard modules in React and Next.js. Integrated REST APIs, JWT auth, and PostgreSQL via Prisma. Led rollout with Jest and Playwright.",
    },
    {
      title: "Fullstack Developer",
      company: "HealthOps",
      description:
        "Built automation workflows for health sales teams using Node.js, Express, and Docker.",
    },
  ],
  skills: ["React", "Next.js", "TypeScript", "Node.js", "Prisma", "PostgreSQL", "Docker", "SaaS"],
  projects: [
    {
      name: "Activation analytics hub",
      description: "Self-serve analytics dashboard for product squads.",
      stack: ["React", "Next.js", "PostgreSQL", "REST"],
    },
  ],
  education: ["B.S. Software Engineering"],
};
