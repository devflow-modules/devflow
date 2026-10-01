import { ingestApplyFlowJob, type ApplyFlowJob, type CandidateProfile, type ResumeLibrary } from "@devflow/applyflow-core";

import type { JobSearchHit, JobSourceId } from "./types";

const SOURCE_ID_PREFIX: Record<JobSourceId, string> = {
  jobgether: "jg",
  theirstack: "ts",
  remoteok: "ro",
};

/** Provider-neutral deterministic ApplyFlow job id: job_jg_<id> | job_ts_<id> | job_ro_<id>. */
export function createExternalJobId(source: JobSourceId, externalId: string): string | null {
  const prefix = SOURCE_ID_PREFIX[source];
  const safe = externalId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!safe || !prefix) return null;
  const id = `job_${prefix}_${safe}`.slice(0, 200);
  const expected = `job_${prefix}_`;
  if (!id.startsWith(expected) || id.length <= expected.length) return null;
  return id;
}

/** @deprecated Prefer createExternalJobId(source, externalId). Kept for Jobgether tests/callers. */
export function applyFlowJobIdFromExternalId(externalId: string): string | null {
  return createExternalJobId("jobgether", externalId);
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
  const id = createExternalJobId(hit.source, hit.externalId);
  if (!id) return { ok: false, reason: "invalid_external_id" };
  const description = hit.description?.trim() ?? "";
  const job = ingestApplyFlowJob({
    id,
    description,
    source: hit.source,
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
