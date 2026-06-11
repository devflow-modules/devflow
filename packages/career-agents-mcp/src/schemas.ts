import { z } from "zod";

export const jobAnalysisInputSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional(),
  description: z.string(),
});

export const resumeExperienceSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional(),
  description: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stack: z.array(z.string()).optional(),
});

export const resumeAnalysisInputSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  experiences: z.array(resumeExperienceSchema).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(resumeProjectSchema).optional(),
  education: z.array(z.string()).optional(),
});

export const matchResumeToJobInputSchema = z.object({
  job: jobAnalysisInputSchema,
  resume: resumeAnalysisInputSchema,
});

const gapSeverityItemSchema = z.object({
  skill: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

export const atsMatchOutputSchema = z.object({
  score: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  evidenceGaps: z.array(z.string()),
  suggestedImprovements: z.array(z.string()),
  scoreBreakdown: z
    .object({
      requiredScore: z.number(),
      niceToHaveScore: z.number(),
      evidenceScore: z.number(),
    })
    .optional(),
  gapSeverity: z.array(gapSeverityItemSchema).optional(),
});

export const explainGapSeverityInputSchema = z.object({
  match: atsMatchOutputSchema,
});

export type JobAnalysisInputParsed = z.infer<typeof jobAnalysisInputSchema>;
export type ResumeAnalysisInputParsed = z.infer<typeof resumeAnalysisInputSchema>;
export type MatchResumeToJobInputParsed = z.infer<typeof matchResumeToJobInputSchema>;
export type ExplainGapSeverityInputParsed = z.infer<typeof explainGapSeverityInputSchema>;
