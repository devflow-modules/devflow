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

export const careerAgentOrchestrationBodySchema = z.object({
  intent: z.enum(CAREER_AGENT_INTENTS),
  explicitConsent: z.literal(true),
  requestedAgent: z.enum(CAREER_AGENT_KINDS).optional(),
  context: z.object({
    careerBundle: careerBundleSchema,
    selectedSignalIds: z.array(z.string()),
    availableSignals: z.array(providerDerivedSignalSchema).optional(),
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
