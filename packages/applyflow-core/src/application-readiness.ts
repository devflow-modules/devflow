import { isOpenableJobUrl } from "./application-pack.js";
import type { ApplyFlowApplicationStatus } from "./application-types.js";
import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import { isJobMatchStale } from "./ingest-applyflow-job.js";
import type { ApplyFlowJob } from "./job-match-types.js";
import type { ResumeLibrary } from "./resume-library-types.js";

export type ApplicationReadinessItemState = "ready" | "attention" | "missing";

export type ApplicationReadinessItemId =
  | "analyzed"
  | "curriculum"
  | "gaps"
  | "source"
  | "application"
  | "submission";

export type ApplicationReadinessItem = {
  id: ApplicationReadinessItemId;
  state: ApplicationReadinessItemState;
  /** Stable machine reason for tests/UI mapping — not a score. */
  reason: string;
  detail?: string;
};

export type ApplicationReadiness = {
  items: ApplicationReadinessItem[];
  recommendedResumeVariantId?: string;
  recommendedResumeVariantName?: string;
  selectedResumeVariantId?: string;
  selectedResumeVariantName?: string;
  evaluatedWithVariantId?: string;
  evaluatedWithVariantName?: string;
  hasApplication: boolean;
  hasSourceUrl: boolean;
  hasStaleMatch: boolean;
  missingSkillCount: number;
  unknownSkillCount: number;
};

const SUBMITTED_STATUSES = new Set<ApplyFlowApplicationStatus>([
  "applied",
  "waiting_response",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
  "hired",
]);

/**
 * Pure derived readiness checklist — no score, no persistence, no Match Engine rerun.
 */
export function deriveApplicationReadiness(input: {
  job: ApplyFlowJob;
  resumeLibrary?: ResumeLibrary | null;
  application?: ApplyFlowApplicationV2Envelope | null;
}): ApplicationReadiness {
  const { job, resumeLibrary } = input;
  const application = input.application ?? null;
  const hasApplication = Boolean(application);
  const hasSourceUrl = isOpenableJobUrl(job.url);
  const hasStaleMatch = isJobMatchStale(job, resumeLibrary ?? null);
  const missingSkillCount = job.jobMatch.missingSkills.length;
  const unknownSkillCount = job.jobMatch.unknownSkills?.length ?? 0;

  const recommendedResumeVariantId = job.curriculumRecommendation?.recommendedVariantId;
  const recommendedResumeVariantName = job.curriculumRecommendation?.recommendedVariantName;
  const selectedResumeVariantId = job.applicationPack?.resume.variantId;
  const selectedResumeVariantName = job.applicationPack?.resume.variantName;
  const evaluatedWithVariantId = job.evaluatedWith?.variantId;
  const evaluatedWithVariantName = job.evaluatedWith?.variantName;

  const items: ApplicationReadinessItem[] = [];

  if (hasStaleMatch) {
    items.push({
      id: "analyzed",
      state: "attention",
      reason: "stale_match",
      detail: evaluatedWithVariantName,
    });
  } else {
    items.push({
      id: "analyzed",
      state: "ready",
      reason: "match_present",
      detail: `${job.jobMatch.score}/100 · ${job.jobMatch.decision}`,
    });
  }

  const libraryEmpty = !resumeLibrary || resumeLibrary.variants.length === 0;
  const selectedStillExists = selectedResumeVariantId
    ? Boolean(resumeLibrary?.variants.some((variant) => variant.id === selectedResumeVariantId))
    : true;
  if (libraryEmpty) {
    items.push({ id: "curriculum", state: "missing", reason: "no_resume" });
  } else if (selectedResumeVariantId && !selectedStillExists) {
    items.push({
      id: "curriculum",
      state: "attention",
      reason: "selected_resume_missing",
      detail: selectedResumeVariantName,
    });
  } else {
    items.push({
      id: "curriculum",
      state: "ready",
      reason: selectedResumeVariantId ? "resume_selected" : "resume_available",
      detail: selectedResumeVariantName ?? recommendedResumeVariantName ?? evaluatedWithVariantName,
    });
  }

  if (job.jobMatch.decision === "needs_info" || unknownSkillCount > 0) {
    items.push({
      id: "gaps",
      state: "attention",
      reason: unknownSkillCount > 0 ? "unknown_skills" : "needs_info",
      detail:
        unknownSkillCount > 0
          ? String(unknownSkillCount)
          : job.jobMatch.decision,
    });
  } else if (missingSkillCount > 0) {
    items.push({
      id: "gaps",
      state: "attention",
      reason: "missing_skills",
      detail: String(missingSkillCount),
    });
  } else {
    items.push({ id: "gaps", state: "ready", reason: "no_explicit_gaps" });
  }

  items.push(
    hasSourceUrl
      ? { id: "source", state: "ready", reason: "source_url_available" }
      : { id: "source", state: "missing", reason: "source_url_missing" },
  );

  items.push(
    hasApplication
      ? { id: "application", state: "ready", reason: "application_registered" }
      : { id: "application", state: "missing", reason: "application_not_registered" },
  );

  if (!hasApplication) {
    items.push({ id: "submission", state: "missing", reason: "not_submitted" });
  } else if (application && SUBMITTED_STATUSES.has(application.status)) {
    items.push({ id: "submission", state: "ready", reason: "externally_submitted", detail: application.status });
  } else {
    items.push({ id: "submission", state: "attention", reason: "tracking_only", detail: application?.status });
  }

  return {
    items,
    ...(recommendedResumeVariantId ? { recommendedResumeVariantId } : {}),
    ...(recommendedResumeVariantName ? { recommendedResumeVariantName } : {}),
    ...(selectedResumeVariantId ? { selectedResumeVariantId } : {}),
    ...(selectedResumeVariantName ? { selectedResumeVariantName } : {}),
    ...(evaluatedWithVariantId ? { evaluatedWithVariantId } : {}),
    ...(evaluatedWithVariantName ? { evaluatedWithVariantName } : {}),
    hasApplication,
    hasSourceUrl,
    hasStaleMatch,
    missingSkillCount,
    unknownSkillCount,
  };
}
