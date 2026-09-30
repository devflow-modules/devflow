import { createJobSearchCache } from "@/lib/job-sources/cache";
import { createJobgetherProvider } from "@/lib/job-sources/jobgether/provider";
import { createJobSearchLogger } from "@/lib/job-sources/log";
import { executeJobSearch, type JobSearchExecution } from "@/lib/job-sources/search-service";

const cache = createJobSearchCache();
const provider = createJobgetherProvider();
const log = createJobSearchLogger();

export function searchJobSources(raw: unknown): Promise<JobSearchExecution> {
  return executeJobSearch(raw, { provider, cache, log });
}
