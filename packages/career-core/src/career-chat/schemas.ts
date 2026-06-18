import { z } from "zod";
import { careerAgentOrchestrationBodySchema } from "../career-agents/schemas.js";
import { careerBundleSchema } from "../schemas/careerBundle.js";
import { CAREER_CHAT_ACTIONS, CAREER_CHAT_MAX_MESSAGE_LENGTH, CAREER_CHAT_PROVIDERS } from "./constants.js";

const chatContextSchema = careerAgentOrchestrationBodySchema.shape.context;

export const careerChatMessageSchema = z
  .object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(CAREER_CHAT_MAX_MESSAGE_LENGTH),
  })
  .strict();

export const libreChatCareerChatBodySchema = z
  .object({
    action: z.enum(CAREER_CHAT_ACTIONS),
    message: z.string().trim().min(1).max(CAREER_CHAT_MAX_MESSAGE_LENGTH),
    explicitConsent: z.literal(true),
    conversationId: z.string().min(1).optional(),
    context: chatContextSchema,
  })
  .strict();

export const careerChatRequestSchema = z
  .object({
    provider: z.enum(CAREER_CHAT_PROVIDERS),
    conversationId: z.string().min(1),
    message: careerChatMessageSchema,
    explicitConsent: z.literal(true),
    action: z.enum(CAREER_CHAT_ACTIONS).optional(),
    context: chatContextSchema,
  })
  .strict();

export type LibreChatCareerChatBody = z.infer<typeof libreChatCareerChatBodySchema>;

export function parseLibreChatCareerChatBody(
  body: unknown,
): { ok: true; value: LibreChatCareerChatBody } | { ok: false; error: "invalid_request" } {
  const parsed = libreChatCareerChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, value: parsed.data };
}
