import { z } from "zod";
import type { AiAnswerReviewResult } from "./ai-answer-review";

const SETTINGS_KEY = "devflow:interview-lab:ai-answer-review-settings:v1";
const LAST_REVIEW_KEY = "devflow:interview-lab:ai-answer-review-last:v1";

const settingsSchema = z.object({
  preferOpenAi: z.boolean(),
  /** Stored only on the user's device; never sent except as Bearer to OpenAI when they click Review. */
  openAiApiKey: z.string().nullable().optional(),
});

export type AiAnswerReviewStoredSettings = z.infer<typeof settingsSchema>;

const defaultSettings: AiAnswerReviewStoredSettings = {
  preferOpenAi: false,
  openAiApiKey: null,
};

function safeParseSettings(raw: unknown): AiAnswerReviewStoredSettings {
  const r = settingsSchema.safeParse(raw);
  return r.success ? r.data : defaultSettings;
}

export function loadAiAnswerReviewSettings(): AiAnswerReviewStoredSettings {
  if (typeof window === "undefined") return { ...defaultSettings };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return safeParseSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...defaultSettings };
  }
}

export function saveAiAnswerReviewSettings(next: Partial<AiAnswerReviewStoredSettings>): AiAnswerReviewStoredSettings {
  const prev = loadAiAnswerReviewSettings();
  const merged: AiAnswerReviewStoredSettings = {
    preferOpenAi: next.preferOpenAi ?? prev.preferOpenAi,
    openAiApiKey: next.openAiApiKey !== undefined ? next.openAiApiKey : prev.openAiApiKey,
  };
  const validated = settingsSchema.parse(merged);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(validated));
  }
  return validated;
}

export function clearStoredOpenAiKey(): void {
  saveAiAnswerReviewSettings({ openAiApiKey: null, preferOpenAi: false });
}

const lastReviewSchema = z.object({
  savedAt: z.string(),
  result: z.object({
    score: z.number(),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    improvedVersion: z.string(),
    englishNotes: z.string(),
    followUpPrompt: z.string(),
  }),
});

export type StoredLastAiReview = z.infer<typeof lastReviewSchema>;

export function loadLastAiAnswerReview(): StoredLastAiReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_REVIEW_KEY);
    if (!raw) return null;
    const r = lastReviewSchema.safeParse(JSON.parse(raw) as unknown);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function saveLastAiAnswerReview(result: AiAnswerReviewResult): void {
  if (typeof window === "undefined") return;
  const payload: StoredLastAiReview = {
    savedAt: new Date().toISOString(),
    result,
  };
  window.localStorage.setItem(LAST_REVIEW_KEY, JSON.stringify(payload));
}

export function clearLastAiAnswerReview(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LAST_REVIEW_KEY);
  }
}
