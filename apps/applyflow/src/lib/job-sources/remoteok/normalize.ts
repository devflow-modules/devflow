import type { JobSearchHit } from "../types";
import { remoteOkHtmlToPlainText } from "./html-to-text";
import type { RemoteOkJob } from "./schema";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isRemoteOkListingUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "remoteok.com" || parsed.hostname === "www.remoteok.com";
  } catch {
    return false;
  }
}

function postedAtFromJob(job: RemoteOkJob): string | undefined {
  if (typeof job.epoch === "number" && Number.isFinite(job.epoch) && job.epoch > 0) {
    const millis = job.epoch > 1_000_000_000_000 ? job.epoch : job.epoch * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (job.date) {
    const parsed = Date.parse(job.date);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return undefined;
}

function meaningfulLocation(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

/**
 * Maps a validated Remote OK job to a JobSearchHit.
 * `apply_url` is intentionally never mapped to `directApplyUrl` (current feed: apply_url === url).
 */
export function normalizeRemoteOkJob(job: RemoteOkJob): JobSearchHit | null {
  if (!isHttpUrl(job.url) || !isRemoteOkListingUrl(job.url)) return null;

  const description = remoteOkHtmlToPlainText(job.description);
  if (!description) return null;

  const hit: JobSearchHit = {
    externalId: String(job.id),
    source: "remoteok",
    title: job.position.trim(),
    company: job.company.trim(),
    description,
    sourceUrl: job.url.trim(),
    remote: "remote",
  };

  const location = meaningfulLocation(job.location);
  if (location) hit.location = location;

  if (job.tags && job.tags.length > 0) {
    hit.technologies = job.tags.slice(0, 12);
  }

  const postedAt = postedAtFromJob(job);
  if (postedAt) hit.postedAt = postedAt;

  // Explicit: never promote apply_url to directApplyUrl in Phase 4.
  return hit;
}
