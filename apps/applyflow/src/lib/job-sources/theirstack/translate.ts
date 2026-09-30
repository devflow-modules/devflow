import type { JobSearchCriteria } from "../types";

/** ISO 3166-1 alpha-2 codes for common ApplyFlow location shorthand. */
const LOCATION_COUNTRY_MAP: Record<string, string[]> = {
  brazil: ["BR"],
  brasil: ["BR"],
  br: ["BR"],
  latam: ["BR", "AR", "MX", "CO", "CL", "PE", "UY"],
  argentina: ["AR"],
  ar: ["AR"],
  mexico: ["MX"],
  méxico: ["MX"],
  mx: ["MX"],
  colombia: ["CO"],
  co: ["CO"],
  chile: ["CL"],
  cl: ["CL"],
};

export type TheirStackSearchBody = {
  page: number;
  limit: number;
  posted_at_max_age_days: number;
  blur_company_data: boolean;
  order_by: Array<{ desc: boolean; field: string }>;
  is_closed?: boolean;
  job_title_or?: string[];
  job_description_pattern_or?: string[];
  job_country_code_or?: string[];
  workplace_types_or?: string[];
  employment_statuses_or?: string[];
  job_seniority_or?: string[];
};

function locationCountryCodes(location: string | undefined): string[] | undefined {
  if (!location) return undefined;
  const key = location.trim().toLowerCase();
  return LOCATION_COUNTRY_MAP[key];
}

function workplaceTypes(remote: JobSearchCriteria["remote"]): string[] | undefined {
  if (!remote) return undefined;
  if (remote === "full_remote" || remote === "remote_first") return ["remote"];
  if (remote === "hybrid") return ["hybrid"];
  if (remote === "include_hybrid") return ["remote", "hybrid"];
  return undefined;
}

function employmentStatuses(contract: JobSearchCriteria["contract"]): string[] | undefined {
  if (!contract) return undefined;
  if (contract === "full_time") return ["full_time"];
  if (contract === "part_time") return ["part_time"];
  if (contract === "internship") return ["internship"];
  if (contract === "freelance") return ["contract"];
  if (contract === "fixed_term") return ["contract"];
  return undefined;
}

function seniority(experience: JobSearchCriteria["experience"]): string[] | undefined {
  if (!experience) return undefined;
  if (experience === "entry" || experience === "junior") return ["junior"];
  if (experience === "mid") return ["mid_level"];
  if (experience === "senior") return ["senior"];
  if (experience === "expert") return ["c_level"];
  return undefined;
}

/**
 * Translate provider-neutral ApplyFlow criteria into TheirStack POST body.
 * ApplyFlow page is 1-based; TheirStack page is 0-based.
 */
export function translateTheirStackCriteria(
  criteria: JobSearchCriteria,
  postedAtMaxAgeDays: number,
): TheirStackSearchBody {
  const body: TheirStackSearchBody = {
    page: Math.max(0, criteria.page - 1),
    limit: criteria.limit,
    posted_at_max_age_days: postedAtMaxAgeDays,
    blur_company_data: false,
    order_by: [{ desc: true, field: "date_posted" }],
    is_closed: false,
  };

  const keyword = criteria.keyword?.trim();
  if (keyword) {
    body.job_title_or = [keyword];
    body.job_description_pattern_or = [keyword];
  }

  const countries = locationCountryCodes(criteria.location);
  if (countries?.length) body.job_country_code_or = countries;

  const workplaces = workplaceTypes(criteria.remote);
  if (workplaces?.length) body.workplace_types_or = workplaces;

  const employment = employmentStatuses(criteria.contract);
  if (employment?.length) body.employment_statuses_or = employment;

  const levels = seniority(criteria.experience);
  if (levels?.length) body.job_seniority_or = levels;

  return body;
}
