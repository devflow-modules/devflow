import { z } from "zod";

export const careerApplicationStatusSchema = z.enum([
  "saved",
  "applied",
  "interview_requested",
  "interview_scheduled",
  "rejected",
  "offer",
]);

export const careerApplicationSourceSchema = z.enum(["linkedin", "manual", "imported"]);

export const careerApplicationSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  seniority: z.string().optional(),
  source: careerApplicationSourceSchema,
  jobDescription: z.string().optional(),
  requiredSkills: z.array(z.string()),
  status: careerApplicationStatusSchema,
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
  matchScore: z.number().finite().optional(),
});

export type CareerApplication = z.infer<typeof careerApplicationSchema>;
export type CareerApplicationStatus = z.infer<typeof careerApplicationStatusSchema>;
export type CareerApplicationSource = z.infer<typeof careerApplicationSourceSchema>;
