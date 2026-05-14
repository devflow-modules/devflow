import { describe, expect, it } from "vitest";
import { getProblemById } from "@/data/problems";
import {
  buildChatGptSessionExport,
  buildExplanationTemplate,
  buildFailedTestsExport,
  formatKeyboardRescueUsed,
} from "@/lib/session-export";
import type { SessionRecord, TestOutcome } from "@/lib/types";
import { emptyChecklist } from "@/lib/types";

function legacySession(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s-legacy",
    problemId: "valid-palindrome",
    code: "function solve() { return true; }",
    elapsedTimeSec: 300,
    checklist: emptyChecklist(),
    passedTests: 3,
    totalTests: 3,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("buildChatGptSessionExport", () => {
  it("includes header and problem metadata", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({ session: legacySession(), problem });
    expect(md).toContain("# DevFlow Interview Lab — Session Review");
    expect(md).toContain("## Guided script usage");
    expect(md).toContain("Not tracked in this session.");
    expect(md).toMatch(/\*\*No Silence mode:\*\* Not tracked/);
    expect(md).toMatch(/\*\*Nudges shown:\*\* Not tracked/);
    expect(md).toMatch(/\*\*Manual speak resets:\*\* Not tracked/);
    expect(md).toContain("## Keyboard rescue");
    expect(md).toMatch(/Used: Not tracked/);
    expect(md).toMatch(/Notes: Not provided\./);
    expect(md).toContain("## Problem");
    expect(md).toContain("Valid Palindrome");
    expect(md).toContain("## Prompt");
  });

  it("includes No Silence metrics when present", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({
      session: legacySession({
        noSilenceMode: "interview",
        nudgeCount: 4,
        manualSpeakResetCount: 2,
      }),
      problem,
    });
    expect(md).toMatch(/\*\*No Silence mode:\*\* Interview/);
    expect(md).toMatch(/\*\*Nudges shown:\*\* 4/);
    expect(md).toMatch(/\*\*Manual speak resets:\*\* 2/);
  });

  it("marks missing Sprint 0.2 fields as Not provided for legacy session", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({ session: legacySession(), problem });
    expect(md).toMatch(/\*\*Before:\*\* Not provided/);
    expect(md).toMatch(/\*\*After:\*\* Not provided/);
    expect(md).toMatch(/## What I said in English\nNot provided\./);
  });

  it("lists failed tests with expected/received when stored", () => {
    const problem = getProblemById("valid-palindrome")!;
    const failed: TestOutcome[] = [
      { id: "not", pass: false, expected: false, received: true, detail: "wrong" },
    ];
    const md = buildChatGptSessionExport({
      session: legacySession({ passedTests: 2, totalTests: 3, testOutcomes: failed }),
      problem,
    });
    expect(md).toContain("## Failed tests");
    expect(md).toContain("### not");
    expect(md).toContain("**Expected:**");
    expect(md).toContain("**Received:**");
    expect(md).toContain("wrong");
  });

  it("notes missing per-test rows when scores show failures without outcomes", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({
      session: legacySession({ passedTests: 1, totalTests: 3 }),
      problem,
    });
    expect(md).toContain("Some tests failed, but per-case");
  });

  it("includes keyboard rescue when reflection saved", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({
      session: legacySession({
        keyboardRescueUsed: true,
        keyboardIssueNotes: "Dead keys on layout",
      }),
      problem,
    });
    expect(md).toContain("## Keyboard rescue");
    expect(md).toMatch(/Used: Yes/);
    expect(md).toMatch(/Notes: Dead keys on layout/);
  });

  it("shows Used: No when reflection says no", () => {
    const problem = getProblemById("valid-palindrome")!;
    const md = buildChatGptSessionExport({
      session: legacySession({ keyboardRescueUsed: false }),
      problem,
    });
    expect(md).toMatch(/Used: No/);
  });

  it("handles missing problem with Not provided placeholders", () => {
    const md = buildChatGptSessionExport({ session: legacySession({ problemId: "unknown-id" }), problem: null });
    expect(md).toContain("Not provided.");
    expect(md).toContain("## Your code");
  });
});

describe("formatKeyboardRescueUsed", () => {
  it("maps tri-state for export", () => {
    expect(formatKeyboardRescueUsed(undefined)).toBe("Not tracked");
    expect(formatKeyboardRescueUsed(null)).toBe("Not tracked");
    expect(formatKeyboardRescueUsed(true)).toBe("Yes");
    expect(formatKeyboardRescueUsed(false)).toBe("No");
  });
});

describe("buildFailedTestsExport", () => {
  it("returns single line when all tests passed", () => {
    const out = buildFailedTestsExport({ session: legacySession({ passedTests: 3, totalTests: 3 }), problemTitle: "X" });
    expect(out).toBe("No failed tests in this session.");
  });

  it("includes failed blocks and debug prompt when outcomes exist", () => {
    const failed: TestOutcome[] = [{ id: "a", pass: false, expected: 1, received: 2 }];
    const out = buildFailedTestsExport({
      session: legacySession({ passedTests: 0, totalTests: 1, testOutcomes: failed }),
      problemTitle: "Demo",
    });
    expect(out).toContain("# Demo");
    expect(out).toContain("### a");
    expect(out).toContain("Help me debug this solution.");
  });

  it("explains missing details when scores show failures but no outcomes", () => {
    const out = buildFailedTestsExport({
      session: legacySession({ passedTests: 1, totalTests: 3 }),
      problemTitle: "Demo",
    });
    expect(out).toContain("Per-test failure details were not stored");
    expect(out).toContain("Help me debug this solution.");
  });
});

describe("buildExplanationTemplate", () => {
  it("includes main narration sections", () => {
    const t = buildExplanationTemplate();
    expect(t).toContain("Let me restate the problem");
    expect(t).toContain("The input is");
    expect(t).toContain("My approach is");
    expect(t).toContain("The time complexity is");
    expect(t).toContain("The space complexity is");
  });
});
