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

/** Same id shape V1 ingest uses when the caller does not supply one. */
export function createApplyFlowJobId(now: Date = new Date()): string {
  return `job_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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
    id: input.id ?? createApplyFlowJobId(now),
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

const TERMINAL_JOB_STATUSES = new Set<ApplyFlowApplication["status"]>([
  "applied",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
]);

export function isJobMatchStale(job: ApplyFlowJob, library?: ResumeLibrary | null): boolean {
  if (!library || library.variants.length === 0) return false;
  const variant = getDefaultResumeVariant(library);
  if (job.evaluatedWith && job.evaluatedWith.variantId !== variant.id) return true;
  const evaluatedAt = Date.parse(job.jobMatch.evaluatedAt);
  const variantUpdated = Date.parse(variant.updatedAt);
  return Number.isFinite(evaluatedAt) && Number.isFinite(variantUpdated) && variantUpdated > evaluatedAt;
}

export function reevaluateApplyFlowJobMatch(
  job: ApplyFlowJob,
  profile: CandidateProfile,
  library?: ResumeLibrary,
  now: Date = new Date(),
): ApplyFlowJob {
  const { profile: evalProfile, evaluatedWith } = resolveEvaluatedProfile({
    description: job.descriptionSnapshot ?? "",
    source: job.source,
    profile,
    resumeLibrary: library,
  });
  const snapshot = job.descriptionSnapshot?.trim() ?? "";
  const intel = snapshot ? extractJobIntelligence(snapshot) : undefined;
  const detectedSkills = intel?.detectedSkills ?? job.jobContext.skills;
  const skills = { skills: detectedSkills };
  const jobMatch = evaluateJobMatch(evalProfile, skills, { now });
  const curriculumRecommendation =
    library && library.variants.length >= 2 ? recommendCurriculum(skills, library, { now }) : job.curriculumRecommendation;
  const status = TERMINAL_JOB_STATUSES.has(job.status) ? job.status : statusFromJobMatchDecision(jobMatch.decision);
  const skillsUnchanged =
    detectedSkills.length === job.jobContext.skills.length &&
    detectedSkills.every((item, index) => item === job.jobContext.skills[index]);
  const sameDecision =
    job.jobMatch.score === jobMatch.score &&
    job.jobMatch.decision === jobMatch.decision &&
    job.status === status &&
    skillsUnchanged &&
    job.evaluatedWith?.variantId === evaluatedWith?.variantId &&
    job.evaluatedWith?.variantName === evaluatedWith?.variantName;
  if (sameDecision && !isJobMatchStale(job, library ?? null)) {
    return job;
  }
  return {
    ...job,
    status,
    jobContext: {
      ...job.jobContext,
      skills: detectedSkills,
      seniority: intel && intel.seniority !== "unknown" ? intel.seniority : job.jobContext.seniority,
      workModel: intel && intel.workModel !== "unknown" ? intel.workModel : job.jobContext.workModel,
      employmentType: intel && intel.contractType !== "unknown" ? intel.contractType : job.jobContext.employmentType,
    },
    jobMatch,
    ...(evaluatedWith ? { evaluatedWith } : { evaluatedWith: undefined }),
    ...(curriculumRecommendation ? { curriculumRecommendation } : {}),
    updatedAt: now.toISOString(),
  };
}

export function reevaluateApplyFlowJobs(
  jobs: ApplyFlowJob[],
  profile: CandidateProfile,
  library?: ResumeLibrary,
  now: Date = new Date(),
): ApplyFlowJob[] {
  let changed = false;
  const next = jobs.map((job) => {
    const refreshed = reevaluateApplyFlowJobMatch(job, profile, library, now);
    if (refreshed !== job) changed = true;
    return refreshed;
  });
  return changed ? next : [...jobs];
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
