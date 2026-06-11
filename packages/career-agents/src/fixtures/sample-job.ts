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
