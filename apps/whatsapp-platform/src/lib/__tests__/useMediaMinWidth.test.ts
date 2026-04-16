/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMediaMinWidth } from "../useMediaMinWidth";

function createMockMediaQueryList(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Map<string, (e: MediaQueryListEvent) => void>();
  const mq = {
    get matches() {
      return matches;
    },
    media: "",
    addEventListener: vi.fn((type: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.set(type, fn);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
  } as unknown as MediaQueryList;
  return {
    mq,
    listeners,
    setMatches(next: boolean) {
      matches = next;
    },
  };
}

describe("useMediaMinWidth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("alinha com matchMedia após o efeito", async () => {
    const { mq } = createMockMediaQueryList(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(mq);
    const { result } = renderHook(() => useMediaMinWidth(1024, false));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("actualiza quando a media query muda", async () => {
    const { mq, listeners, setMatches } = createMockMediaQueryList(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(mq);
    const { result } = renderHook(() => useMediaMinWidth(800, false));
    await waitFor(() => expect(result.current).toBe(false));

    setMatches(true);
    const fn = listeners.get("change");
    expect(fn).toBeDefined();
    act(() => fn!({ matches: true } as MediaQueryListEvent));
    expect(result.current).toBe(true);
  });
});
