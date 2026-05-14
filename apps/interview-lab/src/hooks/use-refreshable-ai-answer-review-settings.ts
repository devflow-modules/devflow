"use client";

import type { AiAnswerReviewStoredSettings } from "@/lib/ai-answer-review-storage";
import { loadAiAnswerReviewSettings } from "@/lib/ai-answer-review-storage";
import { useCallback, useEffect, useState } from "react";

const SSR_DEFAULT: AiAnswerReviewStoredSettings = {
  preferOpenAi: false,
  openAiApiKey: null,
};

function readSettings(): AiAnswerReviewStoredSettings {
  if (typeof window === "undefined") return SSR_DEFAULT;
  return loadAiAnswerReviewSettings();
}

/**
 * Registers listeners so AI Answer Review settings (localStorage) are re-read when the user
 * returns to the tab (`focus`) or when another tab updates storage (`storage`).
 */
export function subscribeAiAnswerReviewSettingsRefresh(onRefresh: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const run = () => {
    onRefresh();
  };
  window.addEventListener("focus", run);
  window.addEventListener("storage", run);
  return () => {
    window.removeEventListener("focus", run);
    window.removeEventListener("storage", run);
  };
}

/** Re-reads `loadAiAnswerReviewSettings` on window focus and cross-tab `storage` events. */
export function useRefreshableAiAnswerReviewSettings(): AiAnswerReviewStoredSettings {
  const [settings, setSettings] = useState<AiAnswerReviewStoredSettings>(readSettings);
  const refresh = useCallback(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => subscribeAiAnswerReviewSettingsRefresh(refresh), [refresh]);

  return settings;
}
