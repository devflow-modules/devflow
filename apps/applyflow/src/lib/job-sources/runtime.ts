import { createJobSearchCache } from "@/lib/job-sources/cache";
import { createJobgetherProvider } from "@/lib/job-sources/jobgether/provider";
import { createJobSearchLogger } from "@/lib/job-sources/log";
import { createRemoteOkProvider } from "@/lib/job-sources/remoteok/provider";
import {
  executeJobSearch,
  type JobSearchAccessContext,
  type JobSearchExecution,
} from "@/lib/job-sources/search-service";
import { createTheirStackProvider } from "@/lib/job-sources/theirstack/provider";

const cache = createJobSearchCache();
const log = createJobSearchLogger();

const providers = {
  jobgether: createJobgetherProvider(),
  theirstack: createTheirStackProvider(),
  remoteok: createRemoteOkProvider(),
};

export function searchJobSources(
  raw: unknown,
  access?: JobSearchAccessContext,
): Promise<JobSearchExecution> {
  return executeJobSearch(raw, { providers, cache, log, access });
}
