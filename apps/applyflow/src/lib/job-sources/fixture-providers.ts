import type { JobSearchCriteria, JobSearchPage, JobSourceProvider } from "./types";

/**
 * Deterministic in-process providers for ApplyFlow E2E.
 * Never perform network I/O. Only loaded when E2E fixture gate is open.
 */

const JOBGETHER_HIT = {
  externalId: "e2e-jg-1",
  source: "jobgether" as const,
  title: "E2E Fixture Frontend Engineer",
  company: "ApplyFlow Fixtures Ltd",
  description:
    "Build React and TypeScript product surfaces. Requires TypeScript, React, and accessibility basics.",
  location: "Remote",
  sourceUrl: "https://jobgether.com/jobs/e2e-jg-1",
  remote: "remote",
  experience: "mid",
};

const REMOTEOK_HIT = {
  externalId: "e2e-ro-1",
  source: "remoteok" as const,
  title: "E2E Fixture Remote Engineer",
  company: "Remote OK Fixture Co",
  description:
    "Remote TypeScript engineer. Stack: TypeScript, Node.js, PostgreSQL. Attribution required for Remote OK.",
  location: "Worldwide",
  sourceUrl: "https://remoteok.com/remote-jobs/e2e-ro-1",
  remote: "remote",
  technologies: ["TypeScript", "Node.js"],
};

function pageFor(
  provider: "jobgether" | "remoteok",
  criteria: JobSearchCriteria,
  hit: typeof JOBGETHER_HIT | typeof REMOTEOK_HIT,
): JobSearchPage {
  const keyword = criteria.keyword?.toLowerCase() ?? "";
  const include = !keyword || hit.title.toLowerCase().includes(keyword) || hit.description.toLowerCase().includes(keyword);
  return {
    provider,
    page: criteria.page,
    limit: criteria.limit,
    hasMore: false,
    hits: include && criteria.page === 1 ? [{ ...hit }] : [],
  };
}

export function createFixtureJobgetherProvider(): JobSourceProvider {
  return {
    id: "jobgether",
    async search(criteria) {
      return { ok: true, page: pageFor("jobgether", criteria, JOBGETHER_HIT) };
    },
  };
}

export function createFixtureRemoteOkProvider(): JobSourceProvider {
  return {
    id: "remoteok",
    async search(criteria) {
      return { ok: true, page: pageFor("remoteok", criteria, REMOTEOK_HIT) };
    },
  };
}

/** Sentinel used by tests to prove TheirStack fixture path never fetches. */
export function createFixtureTheirStackProvider(onSearch: () => void): JobSourceProvider {
  return {
    id: "theirstack",
    async search() {
      onSearch();
      return { ok: false, error: "provider_not_available" };
    },
  };
}
