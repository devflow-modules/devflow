import {
  createCareerChatTrace,
  parseLibreChatCareerChatBody,
  runLibreChatCareerAdapter,
  scanCareerChatPayloadForForbiddenKeys,
  type CareerChatResponse,
  type LibreChatCareerChatBody,
} from "@devflow/career-core";

export const CAREER_CHAT_LIBRECHAT_BLOCKED_MESSAGE =
  "Career chat adapter is blocked until the request is valid, consented, and feature-flagged.";

export type CareerChatLibrechatRequestError = "invalid_json" | "invalid_request";

export function isLibreChatAdapterEnabled(
  env: { [key: string]: string | undefined; LIBRECHAT_ADAPTER_ENABLED?: string } = process.env,
): boolean {
  return env.LIBRECHAT_ADAPTER_ENABLED === "true";
}

export function parseCareerChatLibrechatRequest(
  body: unknown,
):
  | { ok: true; request: LibreChatCareerChatBody }
  | { ok: false; error: CareerChatLibrechatRequestError } {
  if (body == null) {
    return { ok: false, error: "invalid_request" };
  }

  const parsed = parseLibreChatCareerChatBody(body);
  if (!parsed.ok) {
    return { ok: false, error: "invalid_request" };
  }

  if (scanCareerChatPayloadForForbiddenKeys(parsed.value).length > 0) {
    return { ok: false, error: "invalid_request" };
  }

  return { ok: true, request: parsed.value };
}

export function createBlockedCareerChatResponse(warningCode: string): CareerChatResponse {
  return {
    status: "blocked",
    provider: "librechat",
    conversationId: "blocked",
    intent: "unknown",
    agentResult: null,
    toolProposals: [],
    warnings: [{ code: warningCode, message: CAREER_CHAT_LIBRECHAT_BLOCKED_MESSAGE }],
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace: createCareerChatTrace("blocked"),
  };
}

export function handleCareerChatLibrechat(
  request: LibreChatCareerChatBody,
  requestedAt: string,
  adapterEnabled: boolean,
): CareerChatResponse {
  return runLibreChatCareerAdapter({
    body: request,
    requestedAt,
    adapterEnabled,
  });
}

export function resolveCareerChatLibrechatHttpStatus(result: CareerChatResponse): number {
  if (result.status === "blocked") {
    return 403;
  }

  if (result.status === "error") {
    return 500;
  }

  return 200;
}
