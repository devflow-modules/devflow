import type { AiAnswerReviewStoredSettings } from "@/lib/ai-answer-review-storage";

export const AI_COACHING_BADGE_LABEL = "Optional AI layer";

/** User-visible copy when OpenAI is not configured for coaching (same key slot as AI Answer Review). */
export function coachingUnavailableMessage(settings: AiAnswerReviewStoredSettings): string | null {
  if (!settings.preferOpenAi) {
    return 'OpenAI is not enabled. On the AI Answer Review page, turn on "Use OpenAI when a key is present" and save your API key. Keys stay in this browser only; DevFlow servers never receive them.';
  }
  if (!settings.openAiApiKey?.trim()) {
    return "OpenAI is enabled, but no API key is saved. Add your key on the AI Answer Review page, then return here.";
  }
  return null;
}
