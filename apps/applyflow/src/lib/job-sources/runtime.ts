import { createJobSearchCache } from "@/lib/job-sources/cache";
import { createJobgetherProvider } from "@/lib/job-sources/jobgether/provider";
import { createJobSearchLogger } from "@/lib/job-sources/log";
import { executeJobSearch, type JobSearchExecution } from "@/lib/job-sources/search-service";
import { createTheirStackProvider } from "@/lib/job-sources/theirstack/provider";

const cache = createJobSearchCache();
const log = createJobSearchLogger();

const providers = {
  jobgether: createJobgetherProvider(),
  theirstack: createTheirStackProvider(),
};

export function searchJobSources(raw: unknown): Promise<JobSearchExecution> {
  return executeJobSearch(raw, { providers, cache, log });
}
