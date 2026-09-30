import type { JobSearchHit } from "../types";
import type { JobgetherJob } from "./schema";

function isListingUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function postedAtOrUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function normalizeJobgetherJob(job: JobgetherJob): JobSearchHit | null {
  if (!isListingUrl(job.url)) return null;
  const hit: JobSearchHit = {
    externalId: job.id,
    source: "jobgether",
    title: job.title,
    sourceUrl: job.url,
  };
  if (job.company) hit.company = job.company;
  if (job.description) hit.description = job.description;
  if (job.location) hit.location = job.location;
  if (job.remote) hit.remote = job.remote;
  if (job.contractType) hit.contractType = job.contractType;
  if (job.experience) hit.experience = job.experience;
  if (job.salaryRange) hit.salaryRange = job.salaryRange;
  const postedAt = postedAtOrUndefined(job.postedAt);
  if (postedAt) hit.postedAt = postedAt;
  return hit;
}
