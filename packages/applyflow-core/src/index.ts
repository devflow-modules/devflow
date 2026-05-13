export { gustavoProfile, CANDIDATE_PROFILE } from "./candidate-profile.js";
export type { CandidateProfile, EnglishLevel, ApplyflowSkillKey, AnswerBank } from "./profile-schema.js";
export {
  APPLYFLOW_SKILL_KEYS,
  candidateProfileSchema,
  EMPTY_ANSWER_BANK,
  normalizeAnswerBank,
  resolveSkillCanonicalKey,
  validateCandidateProfile,
} from "./profile-schema.js";
export { getSuggestedAnswer } from "./answer-rules.js";
export { getSalarySuggestion } from "./salary-rules.js";
export { calculateFitScore } from "./fit-score.js";
export type { Confidence, FitScoreResult, SalaryContext, SalarySuggestion, SuggestedAnswer } from "./types.js";
export { extractJobIntelligence, normalizeJobTextForIntel } from "./job-intelligence.js";
export type {
  JobContractType,
  JobIntelligence,
  JobRoleType,
  JobSeniority,
  JobWorkModel,
} from "./job-intelligence.js";
export { buildAiPrompt } from "./ai-prompt-builder.js";
export type { AiPromptInput, AiTextTask } from "./ai-prompt-builder.js";
export type {
  ApplyFlowApplication,
  ApplyFlowApplicationStatus,
  ApplyFlowJobMeta,
  SaveApplicationInput,
} from "./application-types.js";
export { APPLYFLOW_APPLICATION_STATUS_LABELS_PT } from "./application-types.js";
export {
  computeApplicationMetrics,
  getApplicationsByPeriod,
  getPeriodCreatedAtFloor,
  APPLICATION_STALE_STATUSES,
  isApplicationStale7d,
} from "./application-metrics.js";
export type { ApplicationMetrics, ApplicationsPeriodFilter } from "./application-metrics.js";
export { parseApplyFlowApplicationsImport, parseApplyFlowImportJsonString } from "./imported-application-schema.js";
export type { ParsedApplyFlowImportResult } from "./imported-application-schema.js";
export type { DashboardImportSummary, DashboardStoredImport, DashboardTableFilters } from "./dashboard-types.js";
export {
  applyDashboardTableFilters,
  bucketApplicationsByWeek,
  countStaleApplications,
  filterApplicationsByContract,
  filterApplicationsByEnglishRequired,
  filterApplicationsByPeriod,
  filterApplicationsBySkill,
  filterApplicationsByStatus,
  filterApplicationsByWorkModel,
  collectDetectedSkills,
  computeCreatedAtRange,
  FUNNEL_STATUS_ORDER,
} from "./dashboard-filters.js";
