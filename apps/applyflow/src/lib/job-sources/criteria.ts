import { z } from "zod";

import {
  DEFAULT_JOB_SOURCE_ID,
  JOB_SEARCH_ABSOLUTE_MAX_LIMIT,
  JOB_SEARCH_CONTRACT,
  JOB_SEARCH_EXPERIENCE,
  JOB_SEARCH_MAX_PAGE,
  JOB_SEARCH_REMOTE,
  JOB_SEARCH_SORT,
  JOB_SOURCE_IDS,
  providerDefaultLimit,
  providerMaxLimit,
  type JobSearchCriteria,
  type JobSourceId,
} from "./types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional();

export const jobSearchRequestSchema = z
  .object({
    provider: z.enum(JOB_SOURCE_IDS).default(DEFAULT_JOB_SOURCE_ID),
    keyword: optionalText(120),
    location: optionalText(80),
    experience: z.enum(JOB_SEARCH_EXPERIENCE).optional(),
    remote: z.enum(JOB_SEARCH_REMOTE).optional(),
    contract: z.enum(JOB_SEARCH_CONTRACT).optional(),
    salaryMin: z.number().int().nonnegative().max(10_000_000).optional(),
    salaryMax: z.number().int().nonnegative().max(10_000_000).optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    sort: z.enum(JOB_SEARCH_SORT).optional(),
    page: z.number().int().min(1).max(JOB_SEARCH_MAX_PAGE).default(1),
    limit: z.number().int().min(1).max(JOB_SEARCH_ABSOLUTE_MAX_LIMIT).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.salaryMin != null &&
      value.salaryMax != null &&
      value.salaryMax < value.salaryMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "salary_range",
      });
    }
    if ((value.salaryMin != null || value.salaryMax != null) && !value.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "currency_required",
      });
    }
    const max = providerMaxLimit(value.provider);
    if (value.limit != null && value.limit > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limit"],
        message: "provider_limit",
      });
    }
  });

export function resolveProviderLimit(provider: JobSourceId, requested?: number): number {
  const max = providerMaxLimit(provider);
  if (requested == null) return providerDefaultLimit(provider);
  return Math.min(Math.max(1, requested), max);
}

export function parseJobSearchCriteria(raw: unknown): JobSearchCriteria | null {
  const parsed = jobSearchRequestSchema.safeParse(raw);
  if (!parsed.success) return null;
  const provider = parsed.data.provider;
  return {
    provider,
    page: parsed.data.page,
    limit: resolveProviderLimit(provider, parsed.data.limit),
    ...(parsed.data.keyword ? { keyword: parsed.data.keyword } : {}),
    ...(parsed.data.location ? { location: parsed.data.location } : {}),
    ...(parsed.data.experience ? { experience: parsed.data.experience } : {}),
    ...(parsed.data.remote ? { remote: parsed.data.remote } : {}),
    ...(parsed.data.contract ? { contract: parsed.data.contract } : {}),
    ...(parsed.data.salaryMin != null ? { salaryMin: parsed.data.salaryMin } : {}),
    ...(parsed.data.salaryMax != null ? { salaryMax: parsed.data.salaryMax } : {}),
    ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
    ...(parsed.data.sort ? { sort: parsed.data.sort } : {}),
  };
}

/** @deprecated Prefer parseJobSearchCriteria — retained name for existing imports. */
export const jobSearchCriteriaSchema = jobSearchRequestSchema;
