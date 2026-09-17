import type { ApplyFlowJob } from "./job-match-types.js";

/** Canonical job URL identity. Keeps query params; drops hash and trailing slash. */
export function canonicalizeJobUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
  } catch {
    return trimmed.replace(/#.*$/, "").replace(/\/+$/, "") || undefined;
  }
}

export function findJobByCanonicalUrl(
  jobs: readonly ApplyFlowJob[],
  url: string | undefined,
): ApplyFlowJob | undefined {
  const canonical = canonicalizeJobUrl(url);
  if (!canonical) return undefined;
  return jobs.find((job) => canonicalizeJobUrl(job.url) === canonical);
}
