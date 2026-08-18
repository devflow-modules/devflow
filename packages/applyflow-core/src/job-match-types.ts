import type { ApplicationPack } from "./application-pack-types.js";
import type { ApplyFlowApplicationStatus } from "./application-types.js";

export const APPLYFLOW_JOB_SOURCES = ["linkedin", "paste", "json"] as const;
export type ApplyFlowJobSource = (typeof APPLYFLOW_JOB_SOURCES)[number];

export const JOB_MATCH_DECISIONS = ["apply", "stretch", "skip"] as const;
export type JobMatchDecision = (typeof JOB_MATCH_DECISIONS)[number];

export const JOB_MATCH_SCORING_VERSION = "v1" as const;
export type JobMatchScoringVersion = typeof JOB_MATCH_SCORING_VERSION;

/** Ranking / confidence version — independent from `jobMatch.scoringVersion`. */
export const CURRICULUM_ROUTER_VERSION = "curriculum-router-v1" as const;
export type CurriculumRouterVersion = typeof CURRICULUM_ROUTER_VERSION;

/** Integer score gaps. Recalibration must bump `CURRICULUM_ROUTER_VERSION`. */
export const CURRICULUM_ROUTER_DELTA_BANDS_V1 = {
  clear: 10,
  moderate: 5,
} as const;

export const CURRICULUM_ROUTER_CONFIDENCE = ["clear", "moderate", "equivalent"] as const;
export type CurriculumRouterConfidence = (typeof CURRICULUM_ROUTER_CONFIDENCE)[number];

export type ResumeMatchCandidate = {
  variantId: string;
  variantName: string;
  score: number;
  decision: JobMatchDecision;
  matchedSkills: string[];
  missingSkills: string[];
};

export type CurriculumRecommendation = {
  recommendedVariantId: string;
  recommendedVariantName: string;
  evaluatedAt: string;
  scoringVersion: JobMatchScoringVersion;
  routerVersion: CurriculumRouterVersion;
  confidence: CurriculumRouterConfidence;
  scoreDelta: number;
  runnerUpVariantId?: string;
  runnerUpVariantName?: string;
  candidates: ResumeMatchCandidate[];
};

export type ApplyFlowJobEvaluatedWith = {
  variantId: string;
  variantName: string;
};

export type ApplyFlowJobMatch = {
  score: number;
  decision: JobMatchDecision;
  matchedSkills: string[];
  missingSkills: string[];
  evaluatedAt: string;
  scoringVersion: JobMatchScoringVersion;
};

export type ApplyFlowJobContext = {
  seniority?: string;
  employmentType?: string;
  workModel?: string;
  skills: string[];
};

export type ApplyFlowJob = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url?: string;
  source: ApplyFlowJobSource;
  status: ApplyFlowApplicationStatus;
  jobContext: ApplyFlowJobContext;
  descriptionSnapshot?: string;
  descriptionHash?: string;
  jobMatch: ApplyFlowJobMatch;
  /** Snapshot of the default variant used for `jobMatch` at ingest. Absent on F1 jobs. */
  evaluatedWith?: ApplyFlowJobEvaluatedWith;
  /** Present only when the library had 2+ variants at ingest. Never recomputed on load. */
  curriculumRecommendation?: CurriculumRecommendation;
  /** Historical preparation snapshot. Absent on F1/F1b/F2 jobs until the user creates one. */
  applicationPack?: ApplicationPack;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedJobSkills = {
  skills: readonly string[];
};
