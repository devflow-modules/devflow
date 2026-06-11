export type { CareerSkill, CareerSeniority, SkillCategory } from "./shared/types.js";
export {
  KNOWN_SKILL_ALIASES,
  SKILL_CATEGORY_MAP,
  SKILL_DETECTION_PATTERNS,
  resolveCanonicalSkillName,
  toCareerSkill,
} from "./shared/skills.js";
export {
  dedupeSkills,
  extractKnownSkills,
  groupSkillsByCategory,
  normalizeLower,
  normalizeText,
} from "./shared/normalize.js";
export { computeAtsScore, computeAtsScoreWithBreakdown } from "./shared/scoring.js";
export type { AtsScoreBreakdown } from "./shared/scoring.js";

export { analyzeJob } from "./job-analysis/index.js";
export type { JobAnalysisInput, JobAnalysisOutput } from "./job-analysis/index.js";

export { analyzeResume } from "./resume-analysis/index.js";
export type {
  ResumeAnalysisInput,
  ResumeAnalysisOutput,
  SkillEvidenceLevel,
} from "./resume-analysis/index.js";

export { matchJobToResume } from "./ats-analysis/index.js";
export type { AtsMatchOutput, GapSeverity } from "./ats-analysis/index.js";

export {
  sampleFullstackSaasJob,
  sampleJobInput,
  sampleSeniorFrontendJob,
} from "./fixtures/sample-job.js";
export {
  sampleJuniorResume,
  sampleResumeInput,
  sampleSeniorProductEngineerResume,
} from "./fixtures/sample-resume.js";
