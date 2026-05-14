import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLastAiAnswerReview,
  loadAiAnswerReviewSettings,
  saveAiAnswerReviewSettings,
} from "./ai-answer-review-storage";

describe("ai-answer-review-storage", () => {
  const mem = new Map<string, string>();

  beforeEach(() => {
    mem.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, v);
        },
        removeItem: (k: string) => {
          mem.delete(k);
        },
      },
    } as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists preferOpenAi and key", () => {
    saveAiAnswerReviewSettings({ preferOpenAi: true, openAiApiKey: "sk-test" });
    const s = loadAiAnswerReviewSettings();
    expect(s.preferOpenAi).toBe(true);
    expect(s.openAiApiKey).toBe("sk-test");
  });

  it("clearLastAiAnswerReview is safe when empty", () => {
    expect(() => clearLastAiAnswerReview()).not.toThrow();
  });
});
