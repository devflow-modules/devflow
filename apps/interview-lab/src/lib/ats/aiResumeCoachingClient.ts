import { extractJsonObject } from "@/lib/ai-answer-review";
import type { AiAnswerReviewStoredSettings } from "@/lib/ai-answer-review-storage";
import { postOpenAiChatJsonCompletion } from "@/lib/openai-chat-json";
import { buildAiResumeCoachingSystemPrompt, buildAiResumeCoachingUserPrompt } from "./aiResumeCoachingPrompt";
import { coachingUnavailableMessage } from "./aiResumeCoachingFallback";
import {
  aiResumeCoachingResultSchema,
  type AiResumeCoachingInput,
  type AiResumeCoachingResult,
} from "./aiResumeCoachingTypes";

export type GenerateAiResumeCoachingResult =
  | { ok: true; data: AiResumeCoachingResult }
  | { ok: false; code: "unavailable" | "parse" | "network"; message: string };

export function parseAiResumeCoachingResponse(raw: string): { ok: true; data: AiResumeCoachingResult } | { ok: false; error: string } {
  try {
    const extracted = extractJsonObject(raw);
    const parsed = JSON.parse(extracted) as unknown;
    const r = aiResumeCoachingResultSchema.safeParse(parsed);
    if (!r.success) {
      return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ") };
    }
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

/**
 * Optional OpenAI coaching — only call after explicit user action.
 * Uses the same browser-stored key as AI Answer Review (`loadAiAnswerReviewSettings`).
 */
export async function generateAiResumeCoaching(
  input: AiResumeCoachingInput,
  settings: Pick<AiAnswerReviewStoredSettings, "preferOpenAi" | "openAiApiKey">,
): Promise<GenerateAiResumeCoachingResult> {
  const unavailable = coachingUnavailableMessage(settings);
  if (unavailable) {
    return { ok: false, code: "unavailable", message: unavailable };
  }

  const key = settings.openAiApiKey!.trim();

  try {
    const content = await postOpenAiChatJsonCompletion({
      apiKey: key,
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        { role: "system", content: buildAiResumeCoachingSystemPrompt() },
        { role: "user", content: buildAiResumeCoachingUserPrompt(input) },
      ],
    });

    const parsed = parseAiResumeCoachingResponse(content);
    if (!parsed.ok) {
      return { ok: false, code: "parse", message: parsed.error };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, code: "network", message: msg };
  }
}
