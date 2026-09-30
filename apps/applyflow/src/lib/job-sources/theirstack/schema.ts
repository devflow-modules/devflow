import { z } from "zod";

const optionalString = z.string().optional().nullable();
const optionalNumber = z.number().optional().nullable();
const optionalBoolean = z.boolean().optional().nullable();

export const theirStackJobSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    job_title: z.string().min(1),
    company: optionalString,
    description: optionalString,
    url: optionalString,
    source_url: optionalString,
    final_url: optionalString,
    country: optionalString,
    country_code: optionalString,
    city: optionalString,
    location: optionalString,
    seniority: optionalString,
    employment_statuses: z.array(z.string()).optional().nullable(),
    remote: optionalBoolean,
    hybrid: optionalBoolean,
    min_annual_salary: optionalNumber,
    max_annual_salary: optionalNumber,
    salary_string: optionalString,
    currency: optionalString,
    technology_slugs: z.array(z.string()).optional().nullable(),
    date_posted: optionalString,
    discovered_at: optionalString,
  })
  .passthrough();

export const theirStackSuccessSchema = z
  .object({
    data: z.array(theirStackJobSchema),
    metadata: z
      .object({
        total_results: z.number().nullable().optional(),
        truncated_results: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type TheirStackJob = z.infer<typeof theirStackJobSchema>;
export type TheirStackSuccess = z.infer<typeof theirStackSuccessSchema>;

export function parseTheirStackSuccess(body: unknown): TheirStackSuccess | null {
  const parsed = theirStackSuccessSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
