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
