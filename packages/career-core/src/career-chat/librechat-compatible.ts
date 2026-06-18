import { runLibreChatCareerAdapter } from "./adapter.js";
import type { LibreChatCareerChatBody } from "./schemas.js";
import { parseLibreChatCareerChatBody } from "./schemas.js";
import type { CareerChatResponse } from "./types.js";

export type LibreChatCompatibleRequest = LibreChatCareerChatBody;

export function parseLibreChatCompatibleRequest(
  body: unknown,
): { ok: true; value: LibreChatCompatibleRequest } | { ok: false; error: "invalid_request" } {
  return parseLibreChatCareerChatBody(body);
}

export function formatLibreChatCompatibleResponse(response: CareerChatResponse): CareerChatResponse {
  return response;
}

export function handleLibreChatCompatibleRequest(input: {
  body: LibreChatCompatibleRequest;
  requestedAt: string;
  adapterEnabled: boolean;
}): CareerChatResponse {
  return runLibreChatCareerAdapter({
    body: input.body,
    requestedAt: input.requestedAt,
    adapterEnabled: input.adapterEnabled,
  });
}
