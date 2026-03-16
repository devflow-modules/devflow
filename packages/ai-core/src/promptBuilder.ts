/**
 * Builder genérico de prompt (system + user).
 * Produtos passam systemPrompt e userContent; ai-core não define texto de negócio.
 */

import type { LLMMessage } from "./types";

export function buildPrompt(systemPrompt: string, userContent: string): LLMMessage[] {
  const system = systemPrompt.trim();
  const user = userContent.trim();
  const messages: LLMMessage[] = [];
  if (system) messages.push({ role: "system", content: system });
  if (user) messages.push({ role: "user", content: user });
  return messages;
}
