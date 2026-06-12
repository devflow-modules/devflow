import { z } from "zod";

export const careerBundleSyncPrivacySchema = z.object({
  rawRetained: z.literal(false),
  redacted: z.literal(true),
  meetingLinksRemoved: z.literal(true),
  providerPayloadRetained: z.literal(false),
  userReviewRequired: z.literal(true),
});

export const careerSyncSignalSchema = z.object({
  id: z.string(),
  source: z.enum(["gmail", "calendar"]),
  safeSummary: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  rawRetained: z.literal(false),
  providerId: z.string().optional(),
  companyHint: z.string().optional(),
  roleHint: z.string().optional(),
  processStage: z.string().optional(),
  actionRequired: z.boolean().optional(),
  receivedAt: z.string().optional(),
  eventAt: z.string().optional(),
});

export const careerBundleSyncEnrichmentSchema = z
  .object({
    source: z.literal("sync"),
    combinedSignals: z.array(careerSyncSignalSchema),
    summary: z.string(),
    stats: z
      .object({
        totalSignals: z.number(),
        actionRequiredCount: z.number(),
        upcomingCount: z.number(),
        stageCounts: z.record(z.string(), z.number()),
        sourceCounts: z.object({
          gmail: z.number(),
          calendar: z.number(),
        }),
        companyHints: z.array(z.string()),
      })
      .passthrough(),
    generatedAt: z.string(),
    privacy: careerBundleSyncPrivacySchema,
    gmail: z.unknown().optional(),
    calendar: z.unknown().optional(),
  })
  .passthrough();
