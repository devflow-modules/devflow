import { createJobSearchCache } from "@/lib/job-sources/cache";
import {
  createFixtureJobgetherProvider,
  createFixtureRemoteOkProvider,
} from "@/lib/job-sources/fixture-providers";
import { createJobgetherProvider } from "@/lib/job-sources/jobgether/provider";
import { createJobSearchLogger } from "@/lib/job-sources/log";
import { createRemoteOkProvider } from "@/lib/job-sources/remoteok/provider";
import {
  executeJobSearch,
  type JobSearchAccessContext,
  type JobSearchExecution,
} from "@/lib/job-sources/search-service";
import { createTheirStackProvider } from "@/lib/job-sources/theirstack/provider";
import { isApplyFlowE2EProviderFixturesEnabled } from "@/lib/e2e/runtime-guard";
import type { JobSourceId, JobSourceProvider } from "@/lib/job-sources/types";

const cache = createJobSearchCache();
const log = createJobSearchLogger();

function resolveProviders(): Partial<Record<JobSourceId, JobSourceProvider>> {
  if (isApplyFlowE2EProviderFixturesEnabled()) {
    return {
      jobgether: createFixtureJobgetherProvider(),
      theirstack: createTheirStackProvider(),
      remoteok: createFixtureRemoteOkProvider(),
    };
  }
  return {
    jobgether: createJobgetherProvider(),
    theirstack: createTheirStackProvider(),
    remoteok: createRemoteOkProvider(),
  };
}

export function searchJobSources(
  raw: unknown,
  access?: JobSearchAccessContext,
): Promise<JobSearchExecution> {
  return executeJobSearch(raw, { providers: resolveProviders(), cache, log, access });
}
