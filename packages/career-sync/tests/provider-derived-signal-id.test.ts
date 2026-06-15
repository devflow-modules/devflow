import { describe, expect, it } from "vitest";
import {
  createProviderDerivedSignalId,
  isProviderDerivedSignalId,
  normalizeTimestampForProviderDerivedSignalId,
  PROVIDER_DERIVED_SIGNAL_ID_PREFIX,
} from "../src/provider-derived-signals/signal-id.js";

describe("normalizeTimestampForProviderDerivedSignalId", () => {
  it("normalizes UTC timestamps to a filename-safe component", () => {
    expect(normalizeTimestampForProviderDerivedSignalId("2026-06-15T18:30:00.000Z")).toBe(
      "2026-06-15T18-30-00-000Z",
    );
  });

  it("normalizes equivalent offsets to the same UTC component", () => {
    expect(normalizeTimestampForProviderDerivedSignalId("2026-06-15T15:30:00.000-03:00")).toBe(
      "2026-06-15T18-30-00-000Z",
    );
  });

  it("rejects invalid timestamps", () => {
    expect(normalizeTimestampForProviderDerivedSignalId("invalid")).toBeUndefined();
  });
});

describe("createProviderDerivedSignalId", () => {
  it("creates a valid Gmail ID", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-15T15:00:00.000Z",
        sequence: 1,
      }),
    ).toBe("provider-signal-gmail-application_detected-2026-06-15T15-00-00-000Z-001");
  });

  it("creates a valid Calendar ID", () => {
    expect(
      createProviderDerivedSignalId({
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-16T18:00:00.000Z",
        sequence: 1,
      }),
    ).toBe("provider-signal-calendar-interview_scheduled-2026-06-16T18-00-00-000Z-001");
  });

  it("is deterministic for the same input", () => {
    const input = {
      source: "gmail" as const,
      kind: "follow_up_required" as const,
      occurredAt: "2026-06-15T18:30:00.000Z",
      sequence: 2,
    };

    expect(createProviderDerivedSignalId(input)).toBe(createProviderDerivedSignalId(input));
  });

  it("treats equivalent offsets as the same temporal component", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "offer_likely",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 1,
      }),
    ).toBe(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "offer_likely",
        occurredAt: "2026-06-15T15:30:00.000-03:00",
        sequence: 1,
      }),
    );
  });

  it("rejects invalid source", () => {
    expect(
      createProviderDerivedSignalId({
        source: "nango" as "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 1,
      }),
    ).toBeUndefined();
  });

  it("rejects invalid kind", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "unknown_kind" as "application_detected",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 1,
      }),
    ).toBeUndefined();
  });

  it("rejects invalid occurredAt", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "not-a-date",
        sequence: 1,
      }),
    ).toBeUndefined();
  });

  it("rejects zero sequence", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 0,
      }),
    ).toBeUndefined();
  });

  it("rejects negative sequence", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: -1,
      }),
    ).toBeUndefined();
  });

  it("rejects decimal sequence", () => {
    expect(
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 1.5,
      }),
    ).toBeUndefined();
  });

  it("pads sequence with three digits", () => {
    expect(
      createProviderDerivedSignalId({
        source: "calendar",
        kind: "follow_up_event_due",
        occurredAt: "2026-06-15T18:30:00.000Z",
        sequence: 12,
      }),
    ).toMatch(/-012$/);
  });

  it("does not include sandbox, runtime, nango, or provider identifiers", () => {
    const id = createProviderDerivedSignalId({
      source: "gmail",
      kind: "interview_likely",
      occurredAt: "2026-06-15T18:30:00.000Z",
      sequence: 1,
    });

    expect(id).toBeDefined();
    expect(id).not.toMatch(/sandbox|runtime|nango|messageId|threadId|eventId|calendarId|@/i);
    expect(id!.startsWith(`${PROVIDER_DERIVED_SIGNAL_ID_PREFIX}-`)).toBe(true);
  });
});

describe("isProviderDerivedSignalId", () => {
  it("accepts valid neutral IDs", () => {
    const id = createProviderDerivedSignalId({
      source: "gmail",
      kind: "application_detected",
      occurredAt: "2026-06-15T18:30:00.000Z",
      sequence: 1,
    });

    expect(isProviderDerivedSignalId(id)).toBe(true);
  });

  it("rejects legacy sandbox-labeled IDs", () => {
    expect(
      isProviderDerivedSignalId(
        "gmail-sandbox-application_detected-2026-06-11T09-00-00-000Z-0",
      ),
    ).toBe(false);
    expect(
      isProviderDerivedSignalId(
        "calendar-sandbox-interview_scheduled-2026-06-20T14-00-00-000Z-0",
      ),
    ).toBe(false);
  });

  it("rejects malformed IDs", () => {
    expect(isProviderDerivedSignalId("provider-signal-gmail")).toBe(false);
    expect(isProviderDerivedSignalId(null)).toBe(false);
    expect(isProviderDerivedSignalId(123)).toBe(false);
  });
});
