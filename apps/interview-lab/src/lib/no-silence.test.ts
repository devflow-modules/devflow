import { describe, expect, it } from "vitest";
import {
  NUDGE_LIBRARY,
  NO_SILENCE_MODE_DEFAULT,
  formatNoSilenceModeLabel,
  getNudgeIntervalSeconds,
  getNudgeMessageAtIndex,
} from "@/lib/no-silence";

describe("getNudgeIntervalSeconds", () => {
  it("returns 0 for off", () => {
    expect(getNudgeIntervalSeconds("off")).toBe(0);
  });
  it("returns 180 for gentle", () => {
    expect(getNudgeIntervalSeconds("gentle")).toBe(180);
  });
  it("returns 90 for interview", () => {
    expect(getNudgeIntervalSeconds("interview")).toBe(90);
  });
});

describe("NUDGE_LIBRARY", () => {
  it("has five categories with two prompts each", () => {
    expect(NUDGE_LIBRARY.length).toBe(10);
    const cats = new Set(NUDGE_LIBRARY.map((l) => l.category));
    expect(cats.size).toBe(5);
    for (const c of cats) {
      expect(NUDGE_LIBRARY.filter((l) => l.category === c).length).toBe(2);
    }
  });

  it("includes required phrases", () => {
    const joined = NUDGE_LIBRARY.map((l) => l.text).join(" ");
    expect(joined).toMatch(/Restate the problem/);
    expect(joined).toMatch(/pseudocode/i);
  });
});

describe("getNudgeMessageAtIndex", () => {
  it("rotates through the library", () => {
    expect(getNudgeMessageAtIndex(0)).toBe(NUDGE_LIBRARY[0]!.text);
    expect(getNudgeMessageAtIndex(NUDGE_LIBRARY.length)).toBe(NUDGE_LIBRARY[0]!.text);
    expect(getNudgeMessageAtIndex(-1)).toBe(NUDGE_LIBRARY[NUDGE_LIBRARY.length - 1]!.text);
  });
});

describe("formatNoSilenceModeLabel", () => {
  it("formats known modes", () => {
    expect(formatNoSilenceModeLabel("off")).toBe("Off");
    expect(formatNoSilenceModeLabel("gentle")).toBe("Gentle");
    expect(formatNoSilenceModeLabel("interview")).toBe("Interview");
  });
});

describe("NO_SILENCE_MODE_DEFAULT", () => {
  it("is gentle", () => {
    expect(NO_SILENCE_MODE_DEFAULT).toBe("gentle");
  });
});
