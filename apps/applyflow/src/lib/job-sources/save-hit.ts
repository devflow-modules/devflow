import { ingestApplyFlowJob, type ApplyFlowJob, type CandidateProfile, type ResumeLibrary } from "@devflow/applyflow-core";

import type { JobSearchHit } from "./types";

const JOB_JG_PREFIX = "job_jg_";

export function applyFlowJobIdFromExternalId(externalId: string): string | null {
  const safe = externalId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!safe) return null;
  const id = `${JOB_JG_PREFIX}${safe}`.slice(0, 200);
  if (!id.startsWith(JOB_JG_PREFIX) || id.length <= JOB_JG_PREFIX.length) return null;
  return id;
}

export function hasAnalyzableJobDescription(description: string | undefined): boolean {
  return Boolean(description && description.trim().length > 0);
}

/** Attaches a user-supplied description to a discovery hit without inventing content. */
export function withHitDescription(hit: JobSearchHit, description: string): JobSearchHit | null {
  const trimmed = description.trim();
  if (!trimmed) return null;
  return { ...hit, description: trimmed };
}

export function ingestDiscoveredJobHit(
  hit: JobSearchHit,
  options: {
    profile: CandidateProfile;
    resumeLibrary?: ResumeLibrary;
    now?: Date;
  },
):
  | { ok: false; reason: "missing_description" | "invalid_external_id" }
  | { ok: true; job: ApplyFlowJob } {
  if (!hasAnalyzableJobDescription(hit.description)) {
    return { ok: false, reason: "missing_description" };
  }
  const id = applyFlowJobIdFromExternalId(hit.externalId);
  if (!id) return { ok: false, reason: "invalid_external_id" };
  const description = hit.description?.trim() ?? "";
  const job = ingestApplyFlowJob({
    id,
    description,
    source: "jobgether",
    title: hit.title,
    company: hit.company,
    location: hit.location,
    url: hit.sourceUrl,
    profile: options.profile,
    resumeLibrary: options.resumeLibrary,
    now: options.now,
  });
  return { ok: true, job };
}
