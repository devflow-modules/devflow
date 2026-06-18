import { deriveCareerAgentRequestId } from "../career-agents/request.js";
import type { CareerChatNormalizedInput, CareerChatRequest } from "./types.js";
import type { LibreChatCareerChatBody } from "./schemas.js";
import { resolveCareerChatIntent } from "./intent.js";

export function deriveCareerChatConversationId(input: {
  action: string;
  message: string;
  careerBundle: import("../schemas/careerBundle.js").CareerBundle;
  selectedSignalIds: readonly string[];
}): string {
  return [
    "career-chat",
    input.action,
    deriveCareerAgentRequestId({
      intent: input.action as LibreChatCareerChatBody["action"],
      careerBundle: input.careerBundle,
      selectedSignalIds: input.selectedSignalIds,
    }),
    input.message.slice(0, 64),
  ].join("::");
}

export function normalizeCareerChatRequest(input: {
  provider: "librechat";
  body: LibreChatCareerChatBody;
}):
  | { ok: true; value: CareerChatNormalizedInput }
  | { ok: false; code: "empty_chat_message" | "message_too_long" | "unsupported_chat_intent"; message: string } {
  const trimmedMessage = input.body.message.trim();
  if (trimmedMessage.length === 0) {
    return { ok: false, code: "empty_chat_message", message: "Chat message cannot be empty." };
  }

  if (trimmedMessage.length > 4000) {
    return { ok: false, code: "message_too_long", message: "Chat message exceeds the allowed length." };
  }

  const intent = resolveCareerChatIntent(input.body.action);
  if (!intent.ok) {
    return { ok: false, code: "unsupported_chat_intent", message: intent.message };
  }

  const conversationId =
    input.body.conversationId ??
    deriveCareerChatConversationId({
      action: intent.intent,
      message: trimmedMessage,
      careerBundle: input.body.context.careerBundle,
      selectedSignalIds: input.body.context.selectedSignalIds,
    });

  return {
    ok: true,
    value: {
      provider: input.provider,
      conversationId,
      action: intent.intent,
      message: {
        role: "user",
        content: trimmedMessage,
      },
      explicitConsent: true,
      context: input.body.context,
    },
  };
}

export function normalizeStructuredCareerChatRequest(
  request: CareerChatRequest,
):
  | { ok: true; value: CareerChatNormalizedInput }
  | { ok: false; code: "empty_chat_message" | "message_too_long" | "unsupported_chat_intent"; message: string } {
  const action = request.action;
  if (!action) {
    return {
      ok: false,
      code: "unsupported_chat_intent",
      message: "Structured chat action is required.",
    };
  }

  return normalizeCareerChatRequest({
    provider: "librechat",
    body: {
      action,
      message: request.message.content,
      explicitConsent: true,
      conversationId: request.conversationId,
      context: request.context,
    },
  });
}
