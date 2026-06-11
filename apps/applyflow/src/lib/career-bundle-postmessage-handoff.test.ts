import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createCareerBundle } from "@devflow/career-core";
import { sendCareerBundleViaPostMessageWithRetry } from "./career-bundle-postmessage-handoff.js";

const bundle = createCareerBundle([
  {
    id: "a1",
    company: "Co",
    role: "Engineer",
    source: "linkedin",
    requiredSkills: ["TypeScript"],
    status: "applied",
  },
]);

describe("sendCareerBundleViaPostMessageWithRetry", () => {
  const listeners: Array<(ev: MessageEvent) => void> = [];
  let mockWin: { closed: boolean; postMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listeners.length = 0;
    mockWin = { closed: false, postMessage: vi.fn() };
    vi.stubGlobal("window", {
      open: vi.fn(() => mockWin),
      addEventListener: vi.fn((type: string, fn: (ev: MessageEvent) => void) => {
        if (type === "message") listeners.push(fn);
      }),
      removeEventListener: vi.fn((type: string, fn: (ev: MessageEvent) => void) => {
        if (type === "message") {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        }
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns ack when Interview Lab confirms delivery", async () => {
    vi.useFakeTimers();
    const promise = sendCareerBundleViaPostMessageWithRetry({
      bundle,
      stringifyBundle: (b) => JSON.stringify(b),
      copyToClipboard: vi.fn(),
      intervalMs: 50,
      totalWaitMs: 500,
      interviewLabUrl: "http://localhost:3015/import/applyflow?handoff=postMessage",
    });

    await vi.advanceTimersByTimeAsync(60);
    for (const fn of listeners) {
      fn(
        new MessageEvent("message", {
          origin: "http://localhost:3015",
          data: {
            type: "devflow.careerBundle.ack.v1",
            source: "interview-lab",
            ok: true,
          },
        }),
      );
    }

    await expect(promise).resolves.toEqual({ kind: "ack" });
    expect(mockWin.postMessage).toHaveBeenCalled();
  });

  it("falls back to clipboard when popup is blocked", async () => {
    vi.mocked(window.open).mockReturnValue(null);
    const copy = vi.fn().mockResolvedValue({ ok: true as const });

    await expect(
      sendCareerBundleViaPostMessageWithRetry({
        bundle,
        stringifyBundle: (b) => JSON.stringify(b),
        copyToClipboard: copy,
      }),
    ).resolves.toEqual({ kind: "fallback_clipboard_ok" });

    expect(copy).toHaveBeenCalledOnce();
  });

  it("falls back to clipboard after timeout without ack", async () => {
    vi.useFakeTimers();
    const copy = vi.fn().mockResolvedValue({ ok: true as const });

    const promise = sendCareerBundleViaPostMessageWithRetry({
      bundle,
      stringifyBundle: (b) => JSON.stringify(b),
      copyToClipboard: copy,
      intervalMs: 50,
      totalWaitMs: 200,
    });

    await vi.advanceTimersByTimeAsync(250);
    await expect(promise).resolves.toEqual({ kind: "fallback_clipboard_ok" });
    expect(copy).toHaveBeenCalledOnce();
  });

  it("ignores ack from wrong origin", async () => {
    vi.useFakeTimers();
    const copy = vi.fn().mockResolvedValue({ ok: true as const });

    const promise = sendCareerBundleViaPostMessageWithRetry({
      bundle,
      stringifyBundle: (b) => JSON.stringify(b),
      copyToClipboard: copy,
      intervalMs: 50,
      totalWaitMs: 200,
    });

    await vi.advanceTimersByTimeAsync(60);
    for (const fn of listeners) {
      fn(
        new MessageEvent("message", {
          origin: "http://evil.example",
          data: {
            type: "devflow.careerBundle.ack.v1",
            source: "interview-lab",
            ok: true,
          },
        }),
      );
    }

    await vi.advanceTimersByTimeAsync(200);
    await expect(promise).resolves.toEqual({ kind: "fallback_clipboard_ok" });
  });
});
