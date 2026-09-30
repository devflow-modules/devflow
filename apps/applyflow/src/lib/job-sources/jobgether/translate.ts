import type { JobSearchCriteria, JobSearchContract, JobSearchExperience, JobSearchRemote } from "../types";

const EXPERIENCE_TO_JOBGETHER: Record<JobSearchExperience, string> = {
  entry: "entry-level-graduate",
  junior: "junior-1-2-years",
  mid: "mid-level-2-5-years",
  senior: "senior-5-10-years",
  expert: "expert-10-years",
};

const CONTRACT_TO_JOBGETHER: Record<JobSearchContract, string> = {
  full_time: "full-time",
  part_time: "part-time",
  fixed_term: "fixed-term",
  freelance: "freelance",
  internship: "internships",
};

const REMOTE_TO_JOBGETHER: Record<Exclude<JobSearchRemote, "include_hybrid">, string> = {
  full_remote: "full-remote",
  remote_first: "remote-first",
  hybrid: "hybrid",
};

export function toJobgetherLocationSlug(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function translateJobSearchCriteria(criteria: JobSearchCriteria): URLSearchParams {
  const params = new URLSearchParams();
  const keyword = criteria.keyword?.trim();
  if (keyword) params.set("keyword", keyword);
  if (criteria.location) {
    const slug = toJobgetherLocationSlug(criteria.location);
    if (slug) params.set("locations", slug);
  }
  if (criteria.experience) params.set("experience", EXPERIENCE_TO_JOBGETHER[criteria.experience]);
  if (criteria.remote === "include_hybrid") {
    params.set("includeHybrid", "true");
  } else if (criteria.remote) {
    params.set("remoteType", REMOTE_TO_JOBGETHER[criteria.remote]);
  }
  if (criteria.contract) params.set("contractType", CONTRACT_TO_JOBGETHER[criteria.contract]);
  if (criteria.salaryMin != null) params.set("salaryMin", String(criteria.salaryMin));
  if (criteria.salaryMax != null) params.set("salaryMax", String(criteria.salaryMax));
  if (criteria.currency) params.set("currency", criteria.currency);
  if (criteria.sort) params.set("sort", criteria.sort);
  params.set("page", String(criteria.page));
  params.set("limit", String(criteria.limit));
  return params;
}
