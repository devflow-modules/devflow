import { z } from "zod";

import {
  JOB_SEARCH_CONTRACT,
  JOB_SEARCH_EXPERIENCE,
  JOB_SEARCH_MAX_LIMIT,
  JOB_SEARCH_MAX_PAGE,
  JOB_SEARCH_REMOTE,
  JOB_SEARCH_SORT,
  type JobSearchCriteria,
} from "./types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional();

export const jobSearchCriteriaSchema = z
  .object({
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
    limit: z.number().int().min(1).max(JOB_SEARCH_MAX_LIMIT).default(10),
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
  });

export function parseJobSearchCriteria(raw: unknown): JobSearchCriteria | null {
  const parsed = jobSearchCriteriaSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}
