import { z } from "zod";

const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const jobgetherJobSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  company: optionalText,
  url: z.string().trim().min(1).max(2000),
  location: optionalText,
  remote: optionalText,
  contractType: optionalText,
  experience: optionalText,
  salaryRange: optionalText,
  description: optionalText,
  postedAt: optionalText,
  jobFunctions: z.array(z.string()).optional(),
});

export const jobgetherSuccessSchema = z.object({
  jobs: z.array(jobgetherJobSchema).max(25),
  pagination: z.object({
    page: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export const jobgetherProblemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  code: z.string().optional(),
  field: z.string().optional(),
});

export type JobgetherJob = z.infer<typeof jobgetherJobSchema>;
export type JobgetherSuccess = z.infer<typeof jobgetherSuccessSchema>;
export type JobgetherProblem = z.infer<typeof jobgetherProblemSchema>;

export function parseJobgetherSuccess(raw: unknown): JobgetherSuccess | null {
  const parsed = jobgetherSuccessSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseJobgetherProblem(raw: unknown): JobgetherProblem | null {
  const parsed = jobgetherProblemSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
