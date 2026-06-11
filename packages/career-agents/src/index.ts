export type { CareerSkill, CareerSeniority, SkillCategory } from "./shared/types.js";
export {
  KNOWN_SKILL_ALIASES,
  dedupeSkills,
  extractKnownSkills,
  normalizeLower,
  normalizeText,
} from "./shared/normalize.js";
export { computeAtsScore } from "./shared/scoring.js";

export { analyzeJob } from "./job-analysis/index.js";
export type { JobAnalysisInput, JobAnalysisOutput } from "./job-analysis/index.js";

export { analyzeResume } from "./resume-analysis/index.js";
export type { ResumeAnalysisInput, ResumeAnalysisOutput } from "./resume-analysis/index.js";

export { matchJobToResume } from "./ats-analysis/index.js";
export type { AtsMatchOutput } from "./ats-analysis/index.js";

export { sampleJobInput } from "./fixtures/sample-job.js";
export { sampleResumeInput } from "./fixtures/sample-resume.js";
