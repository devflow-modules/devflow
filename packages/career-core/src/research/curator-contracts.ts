import { z } from "zod";

export const curatorModeSchema = z.enum([
  "prepare",
  "moderator_assist",
  "structure_notes",
  "classify",
  "synthesize",
]);

export type CuratorMode = z.infer<typeof curatorModeSchema>;

export const confidenceLevelSchema = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export const findingSeveritySchema = z.enum(["P0", "P1", "P2", "P3", "insufficient_evidence"]);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

export const affectedFlowSchema = z.enum([
  "resume",
  "ats",
  "career-plan",
  "privacy",
  "navigation",
  "feedback",
  "discovery",
  "parser",
  "general",
]);

export type AffectedFlow = z.infer<typeof affectedFlowSchema>;

export const pilotDecisionSchema = z.enum([
  "CONTINUE TO NEXT PARTICIPANT",
  "FIX BEFORE NEXT PARTICIPANT",
  "STOP PILOT",
  "INSUFFICIENT EVIDENCE",
]);

export type PilotDecision = z.infer<typeof pilotDecisionSchema>;

export const observationTypeSchema = z.enum([
  "navigation_friction",
  "comprehension_gap",
  "privacy_concern",
  "parser_issue",
  "score_interpretation",
  "moderator_intervention",
  "positive_moment",
  "technical_error",
  "security_incident",
  "task_completion",
  "feedback_behavior",
  "unknown",
]);

export type ObservationType = z.infer<typeof observationTypeSchema>;

export const pilotObservationSchema = z.object({
  type: observationTypeSchema,
  observation: z.string().min(1),
  interpretation: z.string().optional(),
  evidence: z.array(z.string()).default([]),
  confidence: confidenceLevelSchema,
  affectedFlow: affectedFlowSchema.optional(),
  sourceNoteIndex: z.number().int().nonnegative().optional(),
});

export type PilotObservation = z.infer<typeof pilotObservationSchema>;

export const pilotFindingSchema = z.object({
  id: z.string().min(1),
  severity: findingSeveritySchema,
  finding: z.string().min(1),
  observation: z.string().min(1),
  interpretation: z.string().optional(),
  evidence: z.array(z.string()).min(1),
  confidence: confidenceLevelSchema,
  affectedFlow: affectedFlowSchema,
  recommendation: z.string().min(1),
  requiresHumanReview: z.literal(true),
});

export type PilotFinding = z.infer<typeof pilotFindingSchema>;

export const pilotTaskCompletionSchema = z.object({
  taskId: z.string(),
  label: z.string(),
  completed: z.boolean(),
  durationMinutes: z.number().nonnegative().optional(),
});

export type PilotTaskCompletion = z.infer<typeof pilotTaskCompletionSchema>;

export const pilotSummarySchema = z.object({
  sessionId: z.string(),
  participantId: z.string(),
  productVersion: z.string().optional(),
  durationMinutes: z.number().nonnegative().optional(),
  tasksCompleted: z.array(pilotTaskCompletionSchema),
  moderatorInterventions: z.number().int().nonnegative(),
  findingsBySeverity: z.object({
    P0: z.number().int().nonnegative(),
    P1: z.number().int().nonnegative(),
    P2: z.number().int().nonnegative(),
    P3: z.number().int().nonnegative(),
    insufficient_evidence: z.number().int().nonnegative(),
  }),
  anonymizedObservations: z.array(z.string()),
  patterns: z.array(z.string()),
  limitations: z.array(z.string()),
  recommendation: pilotDecisionSchema,
  participantFrequencyLabel: z.string(),
  requiresHumanReview: z.literal(true),
});

export type PilotSummary = z.infer<typeof pilotSummarySchema>;

export const prepareSessionInputSchema = z.object({
  sessionId: z.string().min(1),
  productVersion: z.string().min(1),
  participantProfile: z.string().optional(),
  plannedTasks: z.array(z.string()).optional(),
  previewUrl: z.string().url().optional(),
});

export type PrepareSessionInput = z.infer<typeof prepareSessionInputSchema>;

export const prepareSessionOutputSchema = z.object({
  objective: z.string(),
  risks: z.array(z.string()),
  preflightChecklist: z.array(z.string()),
  openingScript: z.array(z.string()),
  tasks: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      observe: z.array(z.string()),
    }),
  ),
  successCriteria: z.array(z.string()),
  closingCriteria: z.array(z.string()),
  methodologySources: z.array(z.string()),
  requiresHumanReview: z.literal(true),
});

export type PrepareSessionOutput = z.infer<typeof prepareSessionOutputSchema>;

export const moderatorAssistInputSchema = z.object({
  question: z.string().min(1),
  context: z
    .object({
      isTechnicalBlocker: z.boolean().optional(),
      isPiiRisk: z.boolean().optional(),
      isProductionAttempt: z.boolean().optional(),
      sessionStalledMinutes: z.number().optional(),
    })
    .optional(),
});

export type ModeratorAssistInput = z.infer<typeof moderatorAssistInputSchema>;

export const moderatorAssistOutputSchema = z.object({
  guidance: z.array(z.string()),
  avoid: z.array(z.string()),
  interventionAllowed: z.boolean(),
  methodologySources: z.array(z.string()),
  requiresHumanReview: z.literal(true),
});

export type ModeratorAssistOutput = z.infer<typeof moderatorAssistOutputSchema>;

export const pilotCuratorRequestSchema = z.object({
  mode: curatorModeSchema,
  sessionId: z.string().min(1),
  participantId: z.string().min(1),
  productVersion: z.string().optional(),
  participantProfile: z.string().optional(),
  plannedTasks: z.array(z.string()).optional(),
  previewUrl: z.string().url().optional(),
  notes: z.array(z.string()).optional(),
  observations: z.array(pilotObservationSchema).optional(),
  findings: z.array(pilotFindingSchema).optional(),
  moderatorQuestion: z.string().optional(),
  moderatorAssistContext: moderatorAssistInputSchema.shape.context.optional(),
  taskCompletions: z.array(pilotTaskCompletionSchema).optional(),
  durationMinutes: z.number().nonnegative().optional(),
  moderatorInterventions: z.number().int().nonnegative().optional(),
  totalParticipantsInCohort: z.number().int().positive().optional(),
  sessionsWithSamePattern: z.number().int().nonnegative().optional(),
});

export type PilotCuratorRequest = z.infer<typeof pilotCuratorRequestSchema>;

export const pilotCuratorResponseSchema = z.object({
  mode: curatorModeSchema,
  summary: pilotSummarySchema.optional(),
  prepare: prepareSessionOutputSchema.optional(),
  moderatorAssist: moderatorAssistOutputSchema.optional(),
  observations: z.array(pilotObservationSchema),
  findings: z.array(pilotFindingSchema),
  recommendation: pilotDecisionSchema.optional(),
  githubCommentDraft: z.string().optional(),
  methodologySources: z.array(z.string()),
  warnings: z.array(z.string()),
  requiresHumanReview: z.literal(true),
});

export type PilotCuratorResponse = z.infer<typeof pilotCuratorResponseSchema>;

export function parsePilotCuratorRequest(input: unknown): PilotCuratorRequest {
  return pilotCuratorRequestSchema.parse(input);
}
