import { z } from "zod";

import { parseJobSearchCriteria } from "./criteria";
import type { JobSearchHit, JobSearchPage, JobSourceErrorCode } from "./types";
import { JOB_SOURCE_ERROR_CODES } from "./types";

const hitSchema = z
  .object({
    externalId: z.string().min(1),
    source: z.literal("jobgether"),
    title: z.string().min(1),
    company: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    sourceUrl: z.string().min(1),
    remote: z.string().optional(),
    contractType: z.string().optional(),
    experience: z.string().optional(),
    salaryRange: z.string().optional(),
    postedAt: z.string().optional(),
  })
  .strict();

const responseSchema = z
  .object({
    provider: z.literal("jobgether"),
    page: z.number().int(),
    limit: z.number().int(),
    hasMore: z.boolean(),
    cached: z.boolean(),
    hits: z.array(hitSchema),
  })
  .strict();

export type JobSearchClientResult =
  | { ok: true; page: JobSearchPage; cached: boolean }
  | { ok: false; error: JobSourceErrorCode };

function isErrorCode(value: string): value is JobSourceErrorCode {
  return (JOB_SOURCE_ERROR_CODES as readonly string[]).includes(value);
}

export async function requestJobSearch(
  raw: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<JobSearchClientResult> {
  const criteria = parseJobSearchCriteria(raw);
  if (!criteria) return { ok: false, error: "invalid_criteria" };
  const response = await fetchImpl("/api/applyflow/job-sources/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(criteria),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "invalid_provider_response" };
  }
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "";
    return { ok: false, error: isErrorCode(code) ? code : "provider_unavailable" };
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid_provider_response" };
  const hits: JobSearchHit[] = parsed.data.hits.map((hit) => ({ ...hit }));
  return {
    ok: true,
    cached: parsed.data.cached,
    page: {
      provider: "jobgether",
      page: parsed.data.page,
      limit: parsed.data.limit,
      hasMore: parsed.data.hasMore,
      hits,
    },
  };
}
