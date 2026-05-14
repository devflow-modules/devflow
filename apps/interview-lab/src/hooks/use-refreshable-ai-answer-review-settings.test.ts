// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeAiAnswerReviewSettingsRefresh } from "./use-refreshable-ai-answer-review-settings";

describe("subscribeAiAnswerReviewSettingsRefresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("invokes callback on window focus", () => {
    const fn = vi.fn();
    const unsub = subscribeAiAnswerReviewSettingsRefresh(fn);
    window.dispatchEvent(new Event("focus"));
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    window.dispatchEvent(new Event("focus"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("invokes callback on storage", () => {
    const fn = vi.fn();
    const unsub = subscribeAiAnswerReviewSettingsRefresh(fn);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "x" }));
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("returns noop cleanup when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    const fn = vi.fn();
    const unsub = subscribeAiAnswerReviewSettingsRefresh(fn);
    expect(() => unsub()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
