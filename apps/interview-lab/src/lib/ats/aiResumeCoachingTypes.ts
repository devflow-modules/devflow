import { z } from "zod";
import type { AtsAnalysisResult } from "./atsTypes";

export type AiResumeCoachingInput = {
  resumeText: string;
  jobDescriptionText: string;
  atsAnalysis: AtsAnalysisResult;
};

const rewrittenBulletSchema = z.object({
  original: z.string(),
  improved: z.string(),
  reason: z.string(),
});

const weaknessDefenseSchema = z.object({
  gap: z.string(),
  suggestedAnswer: z.string(),
});

export const aiResumeCoachingResultSchema = z.object({
  professionalSummary: z.string().min(1),
  rewrittenBullets: z.array(rewrittenBulletSchema),
  jobSpecificPitch: z.string().min(1),
  interviewTalkingPoints: z.array(z.string()),
  weaknessDefenseStrategy: z.array(weaknessDefenseSchema),
  resumeOptimizationChecklist: z.array(z.string()),
  finalRecommendation: z.string().min(1),
});

export type AiResumeCoachingResult = z.infer<typeof aiResumeCoachingResultSchema>;
