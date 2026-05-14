import { z } from "zod";

export const interviewPreparationSchema = z.object({
  applicationId: z.string().min(1),
  focusAreas: z.array(z.string()),
  technicalQuestions: z.array(z.string()),
  behavioralQuestions: z.array(z.string()),
  speakingPrompts: z.array(z.string()),
  liveCodingHints: z.array(z.string()),
  estimatedSessionMinutes: z.number().int().positive(),
});

export type InterviewPreparation = z.infer<typeof interviewPreparationSchema>;
