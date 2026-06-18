import { CAREER_AGENT_INTENTS } from "../career-agents/types.js";
import type { CareerChatIntent } from "./types.js";

export function resolveCareerChatIntent(
  action: string | undefined,
): { ok: true; intent: CareerChatIntent } | { ok: false; message: string } {
  if (!action) {
    return { ok: false, message: "Chat action is required." };
  }

  if (!(CAREER_AGENT_INTENTS as readonly string[]).includes(action)) {
    return { ok: false, message: "Chat intent is not supported." };
  }

  return { ok: true, intent: action as CareerChatIntent };
}
