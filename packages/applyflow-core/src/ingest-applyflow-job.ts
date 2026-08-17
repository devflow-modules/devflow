import type { ApplyFlowApplication } from "./application-types.js";
import { recommendCurriculum } from "./curriculum-router.js";
import type { CandidateProfile } from "./profile-schema.js";
import { extractJobIntelligence } from "./job-intelligence.js";
import { evaluateJobMatch } from "./evaluate-job-match.js";
import { hashJobDescription, snapshotJobDescription } from "./job-description-snapshot.js";
import { statusFromJobMatchDecision } from "./job-match-thresholds.js";
import type {
  ApplyFlowJob,
  ApplyFlowJobEvaluatedWith,
  ApplyFlowJobSource,
} from "./job-match-types.js";
import { getDefaultResumeVariant } from "./resume-library.js";
import type { ResumeLibrary } from "./resume-library-types.js";

export type IngestApplyFlowJobInput = {
  description: string;
  source: ApplyFlowJobSource;
  title?: string;
  company?: string;
  location?: string;
  url?: string;
  profile: CandidateProfile;
  /** When present, Job Match uses the default variant; Router ranks all variants. */
  resumeLibrary?: ResumeLibrary;
  now?: Date;
  id?: string;
};

function resolveEvaluatedProfile(input: IngestApplyFlowJobInput): {
  profile: CandidateProfile;
  evaluatedWith?: ApplyFlowJobEvaluatedWith;
} {
  const library = input.resumeLibrary;
  if (!library || library.variants.length === 0) {
    return { profile: input.profile };
  }
  const variant = getDefaultResumeVariant(library);
  return {
    profile: variant.profile,
    evaluatedWith: { variantId: variant.id, variantName: variant.name },
  };
}

function inferTitle(description: string, explicit?: string): string {
  const given = explicit?.trim();
  if (given) return given.slice(0, 200);
  const first = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (first && first.length <= 120) return first.slice(0, 200);
  return "Untitled role";
}

function optionalText(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function ingestApplyFlowJob(input: IngestApplyFlowJobInput): ApplyFlowJob {
  const now = input.now ?? new Date();
  const iso = now.toISOString();
  const description = input.description.trim();
  const intel = extractJobIntelligence(description);
  const skills = { skills: intel.detectedSkills };
  const { profile, evaluatedWith } = resolveEvaluatedProfile(input);
  const jobMatch = evaluateJobMatch(profile, skills, { now });
  const snapshot = snapshotJobDescription(description);
  const curriculumRecommendation = input.resumeLibrary
    ? recommendCurriculum(skills, input.resumeLibrary, { now })
    : undefined;

  return {
    id: input.id ?? `job_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    title: inferTitle(description, input.title),
    company: optionalText(input.company, 200),
    location: optionalText(input.location, 200),
    url: optionalText(input.url, 500),
    source: input.source,
    status: statusFromJobMatchDecision(jobMatch.decision),
    jobContext: {
      seniority: intel.seniority === "unknown" ? undefined : intel.seniority,
      employmentType: intel.contractType === "unknown" ? undefined : intel.contractType,
      workModel: intel.workModel === "unknown" ? undefined : intel.workModel,
      skills: intel.detectedSkills,
    },
    descriptionSnapshot: snapshot.length > 0 ? snapshot : undefined,
    descriptionHash: description.length > 0 ? hashJobDescription(description) : undefined,
    jobMatch,
    ...(evaluatedWith ? { evaluatedWith } : {}),
    ...(curriculumRecommendation ? { curriculumRecommendation } : {}),
    createdAt: iso,
    updatedAt: iso,
  };
}

export function projectJobForFunnel(job: ApplyFlowJob): ApplyFlowApplication {
  return {
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    source: job.source,
    status: job.status,
    jobTitle: job.title,
    companyName: job.company,
    jobUrl: job.url,
    fitScore: job.jobMatch.score,
    jobMeta: {
      seniority: job.jobContext.seniority,
      workModel: job.jobContext.workModel,
      contractType: job.jobContext.employmentType,
      detectedSkills: job.jobContext.skills,
    },
  };
}
