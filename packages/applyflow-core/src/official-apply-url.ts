import { isOpenableJobUrl } from "./application-pack.js";
import type { ApplyFlowJob } from "./job-match-types.js";

export const OFFICIAL_APPLY_URL_MAX_CHARS = 500;

export type OfficialApplyUrlError = "invalid_url" | "too_long";

export type OfficialApplyUrlValidation =
  | { ok: true; value: string | undefined }
  | { ok: false; error: OfficialApplyUrlError };

/**
 * Normalize and validate a user-entered official application URL.
 * Empty / whitespace → clear (`undefined`). Absolute http(s) only.
 */
export function validateOfficialApplyUrl(raw: string | null | undefined): OfficialApplyUrlValidation {
  if (raw == null) return { ok: true, value: undefined };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed.length > OFFICIAL_APPLY_URL_MAX_CHARS) return { ok: false, error: "too_long" };
  if (!isOpenableJobUrl(trimmed)) return { ok: false, error: "invalid_url" };
  return { ok: true, value: trimmed };
}

/** Returns a new job with officialApplyUrl set or removed. Does not mutate status. */
export function withOfficialApplyUrl(
  job: ApplyFlowJob,
  raw: string | null | undefined,
  now: Date = new Date(),
): { ok: true; job: ApplyFlowJob } | { ok: false; error: OfficialApplyUrlError } {
  const validated = validateOfficialApplyUrl(raw);
  if (!validated.ok) return { ok: false, error: validated.error };
  const jobContext: ApplyFlowJob["jobContext"] = {
    ...job.jobContext,
    skills: [...job.jobContext.skills],
  };
  if (validated.value) {
    jobContext.officialApplyUrl = validated.value;
  } else {
    delete jobContext.officialApplyUrl;
  }
  return {
    ok: true,
    job: {
      ...job,
      jobContext,
      updatedAt: now.toISOString(),
    },
  };
}
