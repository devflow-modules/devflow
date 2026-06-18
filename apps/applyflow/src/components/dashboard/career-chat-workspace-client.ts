import type { CareerChatResponse, LibreChatCareerChatBody } from "@devflow/career-core";

export const CAREER_CHAT_LIBRECHAT_URL = "/career-chat/librechat";

export type CareerChatWorkspaceUiState =
  | "idle"
  | "validating"
  | "blocked"
  | "completed"
  | "error";

export async function runCareerChatLibrechat(
  body: LibreChatCareerChatBody,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerChatResponse> {
  const response = await fetchImpl(CAREER_CHAT_LIBRECHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerChatResponse;
}
