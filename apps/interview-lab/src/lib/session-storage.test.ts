// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { parseSessionRecordItem, parseSessionsFromUnknown, updateSession } from "@/lib/session-storage";
import type { ChecklistState, SessionRecord } from "@/lib/types";
import { emptyChecklist } from "@/lib/types";

const fullChecklist: ChecklistState = emptyChecklist();

const legacySession = {
  id: "legacy-1",
  problemId: "valid-palindrome",
  code: "// hi",
  elapsedTimeSec: 120,
  checklist: fullChecklist,
  passedTests: 2,
  totalTests: 3,
  createdAt: "2024-06-01T12:00:00.000Z",
};

describe("parseSessionRecordItem", () => {
  it("accepts legacy sessions without Sprint 0.2 fields", () => {
    const row = parseSessionRecordItem(legacySession);
    expect(row).not.toBeNull();
    expect(row!.freezeReasons).toBeUndefined();
    expect(row!.confidenceBefore).toBeUndefined();
    expect(row!.confidenceAfter).toBeUndefined();
    expect(row!.notes).toBeUndefined();
    expect(row!.noSilenceMode).toBeUndefined();
    expect(row!.nudgeCount).toBeUndefined();
    expect(row!.manualSpeakResetCount).toBeUndefined();
    expect(row!.keyboardRescueUsed).toBeUndefined();
    expect(row!.keyboardIssueNotes).toBeUndefined();
  });

  it("accepts sessions with optional Keyboard Rescue (Sprint 0.6) fields", () => {
    const row = parseSessionRecordItem({
      ...legacySession,
      id: "s-kbd",
      keyboardRescueUsed: true,
      keyboardIssueNotes: "Pipe key missing",
    });
    expect(row).not.toBeNull();
    expect(row!.keyboardRescueUsed).toBe(true);
    expect(row!.keyboardIssueNotes).toBe("Pipe key missing");

    const rowNull = parseSessionRecordItem({
      ...legacySession,
      id: "s-kbd-null",
      keyboardRescueUsed: null,
    });
    expect(rowNull).not.toBeNull();
    expect(rowNull!.keyboardRescueUsed).toBeNull();
  });

  it("accepts sessions with optional No Silence (Sprint 0.5) fields", () => {
    const row = parseSessionRecordItem({
      ...legacySession,
      id: "s-ns",
      noSilenceMode: "gentle",
      nudgeCount: 3,
      manualSpeakResetCount: 1,
    });
    expect(row).not.toBeNull();
    expect(row!.noSilenceMode).toBe("gentle");
    expect(row!.nudgeCount).toBe(3);
    expect(row!.manualSpeakResetCount).toBe(1);
  });

  it("accepts sessions with optional Sprint 0.2 fields", () => {
    const row = parseSessionRecordItem({
      ...legacySession,
      id: "s2",
      freezeReasons: ["Time pressure", "Other"],
      confidenceBefore: 2,
      confidenceAfter: 4,
      notes: "Good drill",
      spokenEnglishNotes: "I said: let me restate",
      testOutcomes: [{ id: "t1", pass: true }],
    });
    expect(row).not.toBeNull();
    expect(row!.freezeReasons).toEqual(["Time pressure", "Other"]);
    expect(row!.confidenceBefore).toBe(2);
    expect(row!.confidenceAfter).toBe(4);
    expect(row!.notes).toBe("Good drill");
    expect(row!.spokenEnglishNotes).toBe("I said: let me restate");
    expect(row!.testOutcomes).toEqual([{ id: "t1", pass: true }]);
  });

  it("rejects invalid confidence values", () => {
    expect(
      parseSessionRecordItem({
        ...legacySession,
        id: "bad",
        confidenceBefore: 99,
      }),
    ).toBeNull();
  });
});

describe("parseSessionsFromUnknown", () => {
  it("drops invalid rows but keeps valid legacy rows", () => {
    const rows = parseSessionsFromUnknown([
      legacySession,
      { ...legacySession, id: "bad", confidenceAfter: 0 },
      { ...legacySession, id: "ok", confidenceAfter: 3 },
    ]);
    expect(rows.map((r) => r.id).sort()).toEqual(["legacy-1", "ok"].sort());
  });
});

describe("updateSession (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("merges patch into an existing session", () => {
    const key = "devflow:interview-lab:sessions";
    const s: SessionRecord = {
      ...legacySession,
      id: "upd-1",
      createdAt: "2025-01-02T10:00:00.000Z",
    };
    window.localStorage.setItem(key, JSON.stringify([s]));

    const res = updateSession("upd-1", {
      freezeReasons: ["Writing syntax"],
      confidenceAfter: 5,
      notes: "Felt better",
      spokenEnglishNotes: "Outlined approach aloud",
    });
    expect(res).toEqual({ ok: true });

    const stored = parseSessionsFromUnknown(JSON.parse(window.localStorage.getItem(key)!));
    const one = stored.find((x) => x.id === "upd-1");
    expect(one?.freezeReasons).toEqual(["Writing syntax"]);
    expect(one?.confidenceAfter).toBe(5);
    expect(one?.notes).toBe("Felt better");
    expect(one?.spokenEnglishNotes).toBe("Outlined approach aloud");
    expect(one?.problemId).toBe("valid-palindrome");
  });

  it("merges keyboard rescue reflection fields", () => {
    const key = "devflow:interview-lab:sessions";
    const s: SessionRecord = {
      ...legacySession,
      id: "kbd-upd",
      createdAt: "2025-01-03T10:00:00.000Z",
    };
    window.localStorage.setItem(key, JSON.stringify([s]));

    expect(
      updateSession("kbd-upd", {
        keyboardRescueUsed: true,
        keyboardIssueNotes: "Could not type {}",
      }),
    ).toEqual({ ok: true });

    const one = parseSessionsFromUnknown(JSON.parse(window.localStorage.getItem(key)!)).find((x) => x.id === "kbd-upd");
    expect(one?.keyboardRescueUsed).toBe(true);
    expect(one?.keyboardIssueNotes).toBe("Could not type {}");

    expect(updateSession("kbd-upd", { keyboardRescueUsed: null, keyboardIssueNotes: "" })).toEqual({ ok: true });
    const two = parseSessionsFromUnknown(JSON.parse(window.localStorage.getItem(key)!)).find((x) => x.id === "kbd-upd");
    expect(two?.keyboardRescueUsed).toBeNull();
    expect(two?.keyboardIssueNotes).toBe("");
  });

  it("returns error when session id is missing", () => {
    window.localStorage.setItem("devflow:interview-lab:sessions", JSON.stringify([]));
    expect(updateSession("missing", { notes: "x" })).toMatchObject({ ok: false });
  });
});
