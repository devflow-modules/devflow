import { z } from "zod";
import type { ProviderDerivedSignal, ProviderDerivedSignalKind } from "@devflow/career-sync";
import { careerBundleSchema } from "../schemas/careerBundle.js";
import { CAREER_AGENT_INTENTS, CAREER_AGENT_KINDS } from "./types.js";

const providerDerivedSignalKindSchema = z.custom<ProviderDerivedSignalKind>(
  (value) => typeof value === "string" && value.length > 0,
);

const providerDerivedSignalSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["gmail", "calendar"]),
  kind: providerDerivedSignalKindSchema,
  occurredAt: z.string().min(1),
  startsAt: z.string().optional(),
  company: z.string().optional(),
  confidence: z.number().finite(),
  confidenceLevel: z.enum(["low", "medium", "high"]).optional(),
  reason: z.string().optional(),
  reviewRequired: z.literal(true),
  sourceCount: z.number().int().nonnegative(),
});

const careerResumeSnapshotSchema = z
  .object({
    summary: z.string().max(4000).optional(),
    skills: z.array(z.string().max(200)).max(200),
    experiences: z
      .array(
        z
          .object({
            title: z.string().max(200),
            company: z.string().max(200),
            bullets: z.array(z.string().max(1000)).max(50),
          })
          .strict(),
      )
      .max(50),
    projects: z
      .array(
        z
          .object({
            name: z.string().max(200),
            bullets: z.array(z.string().max(1000)).max(50),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    education: z.array(z.string().max(500)).max(50).optional(),
  })
  .strict();

const careerJobSnapshotSchema = z
  .object({
    title: z.string().max(200),
    requiredRequirements: z.array(z.string().max(1000)).max(100),
    preferredRequirements: z.array(z.string().max(1000)).max(100).optional(),
    keywords: z.array(z.string().max(200)).max(200).optional(),
    roleSummary: z.string().max(4000).optional(),
  })
  .strict();

const careerAnalysisInputSchema = z
  .object({
    resumeSnapshot: careerResumeSnapshotSchema.optional(),
    jobSnapshot: careerJobSnapshotSchema.optional(),
    targetRole: z.string().max(200).optional(),
    targetSeniority: z.string().max(200).optional(),
    targetStack: z.array(z.string().max(200)).max(200).optional(),
    targetRoles: z.array(z.string().max(200)).max(50).optional(),
    availability: z.string().max(500).optional(),
    constraints: z.array(z.string().max(500)).max(50).optional(),
  })
  .strict();

export const careerAgentOrchestrationBodySchema = z.object({
  intent: z.enum(CAREER_AGENT_INTENTS),
  explicitConsent: z.literal(true),
  requestedAgent: z.enum(CAREER_AGENT_KINDS).optional(),
  context: z.object({
    careerBundle: careerBundleSchema,
    selectedSignalIds: z.array(z.string()),
    availableSignals: z.array(providerDerivedSignalSchema).optional(),
    analysisInput: careerAnalysisInputSchema.optional(),
  }),
});

export type CareerAgentOrchestrationBody = z.infer<typeof careerAgentOrchestrationBodySchema>;

export function parseCareerAgentOrchestrationBody(
  body: unknown,
):
  | { ok: true; value: CareerAgentOrchestrationBody }
  | { ok: false; error: "invalid_json" | "invalid_request" } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = careerAgentOrchestrationBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, value: parsed.data };
}

export function isProviderDerivedSignalForAgent(value: unknown): value is ProviderDerivedSignal {
  return providerDerivedSignalSchema.safeParse(value).success;
}
