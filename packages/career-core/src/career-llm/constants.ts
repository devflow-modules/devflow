export const CAREER_LLM_PROVIDERS = ["openai", "mock"] as const;

export const CAREER_LLM_TASKS = [
  "generate_application_fit_explanation",
  "generate_profile_gap_explanation",
  "generate_interview_preparation_content",
  "generate_review_proposal_copy",
] as const;

export const CAREER_LLM_OUTPUT_LIMITS = {
  summaryMaxLength: 1000,
  itemTextMaxLength: 500,
  titleMaxLength: 200,
  maxFindings: 10,
  maxRecommendations: 10,
  maxEvidenceReferences: 20,
} as const;

export const CAREER_LLM_DEFAULT_MODEL_ALIAS = "career-mock-1";

export const CAREER_LLM_DEFAULT_PROVIDER = "mock" as const;
