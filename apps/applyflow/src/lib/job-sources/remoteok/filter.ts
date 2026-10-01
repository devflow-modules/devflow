import type { JobSearchCriteria, JobSearchHit } from "../types";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesFolded(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false;
  return fold(haystack).includes(needle);
}

function titleMatchesSeniority(title: string, experience: JobSearchCriteria["experience"]): boolean {
  const t = fold(title);
  if (experience === "senior") {
    return /\b(senior|sr\.?|lead|staff|principal)\b/.test(t);
  }
  if (experience === "expert") {
    return /\b(principal|staff|distinguished|fellow)\b/.test(t);
  }
  if (experience === "mid") {
    return !/\b(intern|internship|junior|jr\.?|entry|graduate|trainee)\b/.test(t);
  }
  if (experience === "junior" || experience === "entry") {
    return /\b(junior|jr\.?|entry|intern|internship|graduate|trainee)\b/.test(t);
  }
  return true;
}

/**
 * Local filtering over a normalized Remote OK catalog.
 * Empty location is never treated as worldwide.
 * Salary/contract/currency are not applied here — UI must disable those for remoteok.
 */
export function filterRemoteOkCatalog(hits: readonly JobSearchHit[], criteria: JobSearchCriteria): JobSearchHit[] {
  let results = [...hits];

  const keyword = criteria.keyword ? fold(criteria.keyword) : "";
  if (keyword) {
    results = results.filter((hit) => {
      if (includesFolded(hit.title, keyword)) return true;
      if (includesFolded(hit.company, keyword)) return true;
      if (includesFolded(hit.description, keyword)) return true;
      if (hit.technologies?.some((tag) => includesFolded(tag, keyword))) return true;
      return false;
    });
  }

  const location = criteria.location ? fold(criteria.location) : "";
  if (location) {
    results = results.filter((hit) => {
      // Empty/missing location is not worldwide and does not match location filters.
      if (!hit.location || !hit.location.trim()) return false;
      return includesFolded(hit.location, location);
    });
  }

  if (criteria.experience) {
    results = results.filter((hit) => titleMatchesSeniority(hit.title, criteria.experience));
  }

  if (criteria.remote === "hybrid") {
    // Remote OK catalogs remote roles only; hybrid is unsupported → no matches.
    results = [];
  }

  if (criteria.sort === "date") {
    results.sort((a, b) => {
      const aTime = a.postedAt ? Date.parse(a.postedAt) : 0;
      const bTime = b.postedAt ? Date.parse(b.postedAt) : 0;
      return bTime - aTime;
    });
  }

  return results;
}

export function paginateRemoteOkHits(
  hits: readonly JobSearchHit[],
  page: number,
  limit: number,
): { pageHits: JobSearchHit[]; hasMore: boolean } {
  const start = Math.max(0, (page - 1) * limit);
  const pageHits = hits.slice(start, start + limit);
  const hasMore = start + limit < hits.length;
  return { pageHits, hasMore };
}
