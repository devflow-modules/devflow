import { describe, it, expect } from "vitest";
import { inboxSearchIlikePattern } from "../waInboxQueries";

describe("inboxSearchIlikePattern", () => {
  it("retorna null para vazio ou só wildcards", () => {
    expect(inboxSearchIlikePattern("")).toBeNull();
    expect(inboxSearchIlikePattern("   ")).toBeNull();
    expect(inboxSearchIlikePattern("%_%")).toBeNull();
  });

  it("envolve o termo em % e neutraliza wildcards ILIKE", () => {
    expect(inboxSearchIlikePattern("Maria")).toBe("%Maria%");
    expect(inboxSearchIlikePattern("  5511999  ")).toBe("%5511999%");
    expect(inboxSearchIlikePattern("foo%bar_baz")).toBe("%foo bar baz%");
  });

  it("trunca a 120 caracteres antes do padrão", () => {
    const long = "x".repeat(200);
    const pattern = inboxSearchIlikePattern(long);
    expect(pattern).not.toBeNull();
    expect(pattern!.length).toBe(2 + 120);
  });
});
