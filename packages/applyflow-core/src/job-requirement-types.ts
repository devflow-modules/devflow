export const JOB_REQUIREMENT_CATEGORIES = [
  "core_engineering",
  "frontend",
  "backend",
  "cloud",
  "ai",
  "data",
  "product",
  "language",
  "seniority",
  "domain",
  "other",
] as const;

export type JobRequirementCategory = (typeof JOB_REQUIREMENT_CATEGORIES)[number];

export const JOB_REQUIREMENT_IMPORTANCE = ["fundamental", "important", "nice_to_have"] as const;

export type JobRequirementImportance = (typeof JOB_REQUIREMENT_IMPORTANCE)[number];

export const JOB_REQUIREMENT_TYPES = [
  "skill",
  "experience",
  "years",
  "language",
  "location",
  "salary",
  "work_model",
  "schedule",
  "other",
] as const;

export type JobRequirementType = (typeof JOB_REQUIREMENT_TYPES)[number];

/**
 * A job need that keeps context (years, architecture, production) instead of
 * collapsing to a single skill token.
 */
export type JobRequirement = {
  id: string;
  label: string;
  category: JobRequirementCategory;
  importance: JobRequirementImportance;
  requirementType: JobRequirementType;
  extractedText?: string;
  /** Minimum years when the posting states a duration. */
  minYears?: number;
  /** Extra signals: architecture, production, distributed, senior, … */
  qualifiers?: string[];
  /** Canonical skill token when one exists (AWS, Python). Never the only signal. */
  skillHint?: string;
  mandatory?: boolean;
};

export const REQUIREMENT_IMPORTANCE_WEIGHTS = {
  fundamental: 5,
  important: 3,
  nice_to_have: 1,
} as const;
