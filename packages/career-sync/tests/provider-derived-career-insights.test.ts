import { describe, expect, it } from "vitest";
import { createProviderDerivedSignalId } from "../src/provider-derived-signals/signal-id.js";
import type { ProviderDerivedSignal } from "../src/provider-derived-signals/types.js";
import { deriveProviderDerivedCareerInsightsMetrics } from "../src/provider-derived-insights/derive.js";

function signal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id" | "source" | "kind" | "occurredAt">,
): ProviderDerivedSignal {
  return {
    reviewRequired: true,
    confidence: 0.8,
    sourceCount: 1,
    ...overrides,
  };
}

const gmailSignal = signal({
  id:
    createProviderDerivedSignalId({
      source: "gmail",
      kind: "interview_likely",
      occurredAt: "2026-06-01T10:00:00.000Z",
      sequence: 1,
    }) ?? "gmail-signal-1",
  source: "gmail",
  kind: "interview_likely",
  occurredAt: "2026-06-01T10:00:00.000Z",
  company: "Acme",
  confidence: 0.9,
});

const calendarSignal = signal({
  id:
    createProviderDerivedSignalId({
      source: "calendar",
      kind: "follow_up_event_due",
      occurredAt: "2026-06-02T12:00:00.000Z",
      sequence: 1,
    }) ?? "calendar-signal-1",
  source: "calendar",
  kind: "follow_up_event_due",
  occurredAt: "2026-06-02T12:00:00.000Z",
  startsAt: "2026-06-03T14:00:00.000Z",
  confidence: 0.55,
});

describe("deriveProviderDerivedCareerInsightsMetrics", () => {
  it("returns zeroed metrics for no signals", () => {
    const metrics = deriveProviderDerivedCareerInsightsMetrics({ signals: [] });

    expect(metrics).toEqual({
      totalSignals: 0,
      reviewableSignals: 0,
      selectedCount: 0,
      unselectedCount: 0,
      dismissedCount: 0,
      gmailCount: 0,
      calendarCount: 0,
      kindCounts: [],
      confidenceBuckets: { high: 0, medium: 0, low: 0 },
      averageConfidence: null,
      allReviewRequired: true,
      companies: [],
    });
  });

  it("counts one available signal", () => {
    const metrics = deriveProviderDerivedCareerInsightsMetrics({ signals: [gmailSignal] });

    expect(metrics.totalSignals).toBe(1);
    expect(metrics.reviewableSignals).toBe(1);
    expect(metrics.unselectedCount).toBe(1);
    expect(metrics.gmailCount).toBe(1);
    expect(metrics.confidenceBuckets.high).toBe(1);
    expect(metrics.companies).toEqual(["Acme"]);
  });

  it("counts multiple signals with selection and dismissal", () => {
    const metrics = deriveProviderDerivedCareerInsightsMetrics({
      signals: [gmailSignal, calendarSignal],
      selectedSignalIds: [gmailSignal.id],
      dismissedSignalIds: [calendarSignal.id],
    });

    expect(metrics.totalSignals).toBe(2);
    expect(metrics.reviewableSignals).toBe(2);
    expect(metrics.selectedCount).toBe(1);
    expect(metrics.unselectedCount).toBe(0);
    expect(metrics.dismissedCount).toBe(1);
    expect(metrics.gmailCount).toBe(1);
    expect(metrics.calendarCount).toBe(0);
    expect(metrics.kindCounts).toEqual([{ kind: "interview_likely", count: 1 }]);
  });

  it("sorts kind counts deterministically", () => {
    const followUp = signal({
      ...calendarSignal,
      id:
        createProviderDerivedSignalId({
          source: "gmail",
          kind: "follow_up_required",
          occurredAt: "2026-06-04T08:00:00.000Z",
          sequence: 1,
        }) ?? "follow-up-signal-1",
      source: "gmail",
      kind: "follow_up_required",
      occurredAt: "2026-06-04T08:00:00.000Z",
    });

    const metrics = deriveProviderDerivedCareerInsightsMetrics({
      signals: [gmailSignal, followUp],
    });

    expect(metrics.kindCounts.map((entry) => entry.kind)).toEqual([
      "follow_up_required",
      "interview_likely",
    ]);
  });

  it("does not mutate input arrays", () => {
    const signals = [gmailSignal];
    const selectedSignalIds = [gmailSignal.id];
    const dismissedSignalIds: string[] = [];

    deriveProviderDerivedCareerInsightsMetrics({
      signals,
      selectedSignalIds,
      dismissedSignalIds,
    });

    expect(signals).toHaveLength(1);
    expect(selectedSignalIds).toEqual([gmailSignal.id]);
    expect(dismissedSignalIds).toEqual([]);
  });

  it("omits non-reviewable signals from active counts", () => {
    const invalid = {
      ...gmailSignal,
      reviewRequired: false as unknown as true,
    };

    const metrics = deriveProviderDerivedCareerInsightsMetrics({ signals: [invalid] });

    expect(metrics.totalSignals).toBe(1);
    expect(metrics.reviewableSignals).toBe(0);
    expect(metrics.unselectedCount).toBe(0);
  });

  it("never includes forbidden identifier fields in output shape", () => {
    const metrics = deriveProviderDerivedCareerInsightsMetrics({
      signals: [gmailSignal, calendarSignal],
      selectedSignalIds: [gmailSignal.id],
    });

    const serialized = JSON.stringify(metrics);

    expect(serialized).not.toMatch(
      /access_token|refresh_token|connectionId|providerId|messageId|threadId|eventId|calendarId|subject|snippet|body|description|location|meetingLink|attendeeEmail|organizerEmail/i,
    );
  });
});
