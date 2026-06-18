import { z } from "zod";
import { careerAgentOrchestrationBodySchema } from "../career-agents/schemas.js";
import { CAREER_CHAT_ACTIONS, CAREER_CHAT_MAX_MESSAGE_LENGTH } from "../career-chat/constants.js";

const llmContextSchema = careerAgentOrchestrationBodySchema.shape.context;

export const careerLlmChatRequestSchema = z
  .object({
    action: z.enum(CAREER_CHAT_ACTIONS),
    message: z.string().trim().min(1).max(CAREER_CHAT_MAX_MESSAGE_LENGTH),
  })
  .strict();

/**
 * Public request body for POST /career-llm/generate.
 * The client never sends provider, model, temperature, prompt, task, agent,
 * capabilities, execution plan, or tools. The schema is strict to reject extras.
 */
export const careerLlmGenerateBodySchema = z
  .object({
    agentRequestId: z.string().min(1).optional(),
    explicitConsent: z.literal(true),
    chatRequest: careerLlmChatRequestSchema,
    context: llmContextSchema,
  })
  .strict();

export type CareerLlmGenerateBody = z.infer<typeof careerLlmGenerateBodySchema>;
export type CareerLlmChatRequest = z.infer<typeof careerLlmChatRequestSchema>;

export function parseCareerLlmGenerateBody(
  body: unknown,
): { ok: true; value: CareerLlmGenerateBody } | { ok: false; error: "invalid_request" } {
  const parsed = careerLlmGenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, value: parsed.data };
}
