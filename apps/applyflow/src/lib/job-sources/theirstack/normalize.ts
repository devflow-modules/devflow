import type { JobSearchHit } from "../types";
import type { TheirStackJob } from "./schema";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function postedAtOrUndefined(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function normalizeLocation(job: TheirStackJob): string | undefined {
  const parts = [job.city, job.location, job.country]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return [...new Set(parts)].join(", ");
}

function normalizeSalary(job: TheirStackJob): string | undefined {
  if (typeof job.salary_string === "string" && job.salary_string.trim()) {
    return job.salary_string.trim();
  }
  const min = typeof job.min_annual_salary === "number" ? job.min_annual_salary : null;
  const max = typeof job.max_annual_salary === "number" ? job.max_annual_salary : null;
  if (min == null && max == null) return undefined;
  if (min === 0 && max === 0) return undefined;
  const currency = typeof job.currency === "string" && job.currency.trim() ? job.currency.trim() : "";
  if (min != null && max != null && min > 0 && max > 0) {
    return currency ? `${currency} ${min}-${max}` : `${min}-${max}`;
  }
  if (min != null && min > 0) return currency ? `${currency} ${min}+` : `${min}+`;
  if (max != null && max > 0) return currency ? `up to ${currency} ${max}` : `up to ${max}`;
  return undefined;
}

function normalizeRemote(job: TheirStackJob): string | undefined {
  if (job.remote === true) return "remote";
  if (job.hybrid === true) return "hybrid";
  return undefined;
}

function normalizeContract(job: TheirStackJob): string | undefined {
  const first = job.employment_statuses?.[0];
  return typeof first === "string" && first.trim() ? first.trim() : undefined;
}

function listingUrl(job: TheirStackJob): string | null {
  const candidates = [job.source_url, job.url];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && isHttpUrl(candidate)) return candidate;
  }
  return null;
}

function directApplyUrl(job: TheirStackJob): string | undefined {
  if (typeof job.final_url === "string" && isHttpUrl(job.final_url)) return job.final_url;
  return undefined;
}

export function normalizeTheirStackJob(job: TheirStackJob): JobSearchHit | null {
  const sourceUrl = listingUrl(job);
  if (!sourceUrl) return null;

  const externalId = String(job.id);
  const hit: JobSearchHit = {
    externalId,
    source: "theirstack",
    title: job.job_title.trim(),
    sourceUrl,
  };

  if (typeof job.company === "string" && job.company.trim()) hit.company = job.company.trim();
  if (typeof job.description === "string" && job.description.trim()) {
    hit.description = job.description.trim();
  }
  const location = normalizeLocation(job);
  if (location) hit.location = location;
  const remote = normalizeRemote(job);
  if (remote) hit.remote = remote;
  const contractType = normalizeContract(job);
  if (contractType) hit.contractType = contractType;
  if (typeof job.seniority === "string" && job.seniority.trim()) {
    hit.experience = job.seniority.trim();
  }
  const salaryRange = normalizeSalary(job);
  if (salaryRange) hit.salaryRange = salaryRange;
  const applyUrl = directApplyUrl(job);
  if (applyUrl) hit.directApplyUrl = applyUrl;
  if (Array.isArray(job.technology_slugs) && job.technology_slugs.length > 0) {
    hit.technologies = job.technology_slugs.filter((slug) => typeof slug === "string" && slug.trim());
  }
  const postedAt = postedAtOrUndefined(job.date_posted ?? job.discovered_at ?? undefined);
  if (postedAt) hit.postedAt = postedAt;

  return hit;
}
