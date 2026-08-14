import type { ApplyFlowApplicationStatus } from "./application-types.js";

export const APPLYFLOW_JOB_SOURCES = ["linkedin", "paste", "json"] as const;
export type ApplyFlowJobSource = (typeof APPLYFLOW_JOB_SOURCES)[number];

export const JOB_MATCH_DECISIONS = ["apply", "stretch", "skip"] as const;
export type JobMatchDecision = (typeof JOB_MATCH_DECISIONS)[number];

export const JOB_MATCH_SCORING_VERSION = "v1" as const;
export type JobMatchScoringVersion = typeof JOB_MATCH_SCORING_VERSION;

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
  createdAt: string;
  updatedAt: string;
};

export type NormalizedJobSkills = {
  skills: readonly string[];
};
