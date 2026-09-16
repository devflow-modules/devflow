import { canonicalizeJobUrl } from "./job-url-identity.js";
import type { ApplyFlowJob } from "./job-match-types.js";

export function mergeApplyFlowJobs(
  existing: ApplyFlowJob[],
  incoming: ApplyFlowJob[],
): { jobs: ApplyFlowJob[]; added: number; skipped: number } {
  const byId = new Map(existing.map((job) => [job.id, job]));
  const hashes = new Set(
    existing.map((job) => job.descriptionHash).filter((hash): hash is string => Boolean(hash)),
  );
  const urls = new Set(
    existing
      .map((job) => canonicalizeJobUrl(job.url))
      .filter((url): url is string => Boolean(url)),
  );
  let added = 0;
  let skipped = 0;

  for (const job of incoming) {
    const canonicalUrl = canonicalizeJobUrl(job.url);
    if (byId.has(job.id) || (job.descriptionHash && hashes.has(job.descriptionHash)) || (canonicalUrl && urls.has(canonicalUrl))) {
      skipped += 1;
      continue;
    }
    byId.set(job.id, job);
    if (job.descriptionHash) hashes.add(job.descriptionHash);
    if (canonicalUrl) urls.add(canonicalUrl);
    added += 1;
  }

  return { jobs: [...byId.values()], added, skipped };
}
