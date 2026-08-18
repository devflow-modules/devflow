import type { AnswerBank, EnglishLevel } from "./profile-schema.js";
import type { JobMatchDecision, JobMatchScoringVersion } from "./job-match-types.js";

export const APPLICATION_PACK_SCHEMA_VERSION = 1 as const;
export const APPLICATION_PACK_VERSION = "application-pack-v1" as const;
export type ApplicationPackVersion = typeof APPLICATION_PACK_VERSION;

export const APPLICATION_PACK_CHECKLIST_IDS = [
  "review-resume",
  "review-highlights",
  "review-gaps",
  "review-answers",
  "open-job",
  "mark-applied",
] as const;

export type ApplicationPackChecklistId = (typeof APPLICATION_PACK_CHECKLIST_IDS)[number];

export type ApplicationPackChecklistItem = {
  id: ApplicationPackChecklistId;
  done: boolean;
};

export type ApplicationPackResumeRef = {
  variantId: string;
  variantName: string;
  recommendedByRouter: boolean;
};

export type ApplicationPackMatchSnapshot = {
  score: number;
  decision: JobMatchDecision;
  matchedSkills: string[];
  missingSkills: string[];
  scoringVersion: JobMatchScoringVersion;
};

export type ApplicationPackSalaryFacts = {
  cltPleno?: string;
  cltSenior?: string;
  pjSenior?: string;
  usdMonthly?: string;
  usdHourly?: string;
};

export type ApplicationPackCandidateFacts = {
  name?: string;
  location?: string;
  englishLevel?: EnglishLevel;
  comfortableInEnglish?: boolean;
  roles?: string[];
  salary?: ApplicationPackSalaryFacts;
  answerBank?: Partial<AnswerBank>;
};

export type ApplicationPack = {
  version: typeof APPLICATION_PACK_SCHEMA_VERSION;
  packVersion: ApplicationPackVersion;
  createdAt: string;
  updatedAt: string;
  jobId: string;
  resume: ApplicationPackResumeRef;
  match: ApplicationPackMatchSnapshot;
  highlights: string[];
  gaps: string[];
  candidateFacts: ApplicationPackCandidateFacts;
  checklist: ApplicationPackChecklistItem[];
};

export type ApplicationPackResumeSource = "explicit" | "recommended" | "evaluated-with" | "default";
