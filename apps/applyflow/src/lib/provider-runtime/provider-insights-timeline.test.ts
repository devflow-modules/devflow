import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { describe, expect, it } from "vitest";
import {
  buildProviderInsightsTimelineSummaryView,
  compareProviderInsightsTimelineSignals,
  filterProviderInsightsSignals,
  groupProviderInsightsSignalsByDay,
  resolveProviderInsightsTimelineViewState,
} from "./provider-insights-timeline";

function createSignal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id">,
): ProviderDerivedSignal {
  return {
    source: "gmail",
    kind: "provider_email_activity",
    occurredAt: "2026-06-10T10:00:00.000Z",
    confidence: 0.8,
    confidenceLevel: "high",
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

describe("compareProviderInsightsTimelineSignals", () => {
  it("orders deterministically by occurredAt, source, kind, and id", () => {
    const signals = [
      createSignal({ id: "b", occurredAt: "2026-06-10T11:00:00.000Z", source: "gmail" }),
      createSignal({
        id: "a",
        occurredAt: "2026-06-10T10:00:00.000Z",
        source: "calendar",
        kind: "provider_calendar_activity",
      }),
      createSignal({ id: "c", occurredAt: "2026-06-10T10:00:00.000Z", source: "gmail" }),
      createSignal({
        id: "d",
        occurredAt: "2026-06-10T10:00:00.000Z",
        source: "calendar",
        kind: "provider_activity_cluster",
      }),
    ];

    const sorted = [...signals].sort(compareProviderInsightsTimelineSignals);
    expect(sorted.map((signal) => signal.id)).toEqual(["d", "a", "c", "b"]);
  });

  it("produces identical ordering across repeated sorts", () => {
    const signals = [
      createSignal({ id: "sig-3", occurredAt: "2026-06-09T08:00:00.000Z", confidenceLevel: "medium" }),
      createSignal({
        id: "sig-1",
        source: "calendar",
        kind: "provider_calendar_activity",
        occurredAt: "2026-06-10T12:00:00.000Z",
      }),
      createSignal({
        id: "sig-2",
        kind: "provider_activity_cluster",
        occurredAt: "2026-06-10T12:00:00.000Z",
      }),
    ];

    const first = [...signals].sort(compareProviderInsightsTimelineSignals).map((signal) => signal.id);
    const second = [...signals].sort(compareProviderInsightsTimelineSignals).map((signal) => signal.id);

    expect(first).toEqual(second);
    expect(first).toEqual(["sig-3", "sig-1", "sig-2"]);
  });
});

describe("filterProviderInsightsSignals", () => {
  const signals = [
    createSignal({ id: "gmail-high", source: "gmail", confidenceLevel: "high" }),
    createSignal({
      id: "calendar-medium",
      source: "calendar",
      kind: "provider_calendar_activity",
      confidenceLevel: "medium",
    }),
    createSignal({
      id: "cluster",
      kind: "provider_activity_cluster",
      confidenceLevel: "high",
    }),
    createSignal({ id: "gmail-low", confidenceLevel: "low", confidence: 0.2 }),
  ];

  it("returns all signals sorted when filter is all", () => {
    const filtered = filterProviderInsightsSignals(signals, "all");
    expect(filtered).toHaveLength(4);
    expect(filtered.map((signal) => signal.id)).toEqual(
      [...signals].sort(compareProviderInsightsTimelineSignals).map((signal) => signal.id),
    );
  });

  it("filters by gmail source", () => {
    const filtered = filterProviderInsightsSignals(signals, "gmail");
    expect(filtered.map((signal) => signal.id)).toEqual(["cluster", "gmail-high", "gmail-low"]);
    expect(filtered.every((signal) => signal.source === "gmail")).toBe(true);
  });

  it("filters by calendar source", () => {
    const filtered = filterProviderInsightsSignals(signals, "calendar");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("calendar-medium");
  });

  it("filters correlation cluster signals", () => {
    const filtered = filterProviderInsightsSignals(signals, "correlation");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kind).toBe("provider_activity_cluster");
  });

  it("filters by confidence level", () => {
    expect(filterProviderInsightsSignals(signals, "high").map((signal) => signal.id)).toEqual([
      "cluster",
      "gmail-high",
    ]);
    expect(filterProviderInsightsSignals(signals, "medium").map((signal) => signal.id)).toEqual([
      "calendar-medium",
    ]);
    expect(filterProviderInsightsSignals(signals, "low").map((signal) => signal.id)).toEqual(["gmail-low"]);
  });
});

describe("groupProviderInsightsSignalsByDay", () => {
  it("groups signals by day with most recent days first", () => {
    const signals = [
      createSignal({ id: "day1-a", occurredAt: "2026-06-10T08:00:00.000Z" }),
      createSignal({ id: "day2-a", occurredAt: "2026-06-11T09:00:00.000Z" }),
      createSignal({ id: "day1-b", occurredAt: "2026-06-10T14:00:00.000Z" }),
    ];

    const groups = groupProviderInsightsSignalsByDay(signals);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.dayKey).toBe("2026-06-11");
    expect(groups[1]?.dayKey).toBe("2026-06-10");
    expect(groups[1]?.signals.map((signal) => signal.id)).toEqual(["day1-a", "day1-b"]);
  });

  it("keeps stable ordering within each day group", () => {
    const signals = [
      createSignal({
        id: "cal",
        source: "calendar",
        kind: "provider_calendar_activity",
        occurredAt: "2026-06-10T10:00:00.000Z",
      }),
      createSignal({ id: "gmail", occurredAt: "2026-06-10T10:00:00.000Z" }),
    ];

    const groups = groupProviderInsightsSignalsByDay(signals);
    expect(groups[0]?.signals.map((signal) => signal.id)).toEqual(["cal", "gmail"]);
  });
});

describe("resolveProviderInsightsTimelineViewState", () => {
  it("returns no_preview for idle and loading states", () => {
    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "idle",
        totalSignals: 0,
        filteredCount: 0,
      }),
    ).toBe("no_preview");

    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "loading",
        totalSignals: 5,
        filteredCount: 5,
      }),
    ).toBe("no_preview");
  });

  it("returns blocked when preview is blocked", () => {
    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "blocked",
        totalSignals: 0,
        filteredCount: 0,
      }),
    ).toBe("blocked");

    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "ready",
        previewStatus: "blocked",
        totalSignals: 0,
        filteredCount: 0,
      }),
    ).toBe("blocked");
  });

  it("returns zero_signals when preview has no signals", () => {
    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "ready",
        previewStatus: "completed",
        totalSignals: 0,
        filteredCount: 0,
      }),
    ).toBe("zero_signals");
  });

  it("returns filter_empty when filter removes all signals", () => {
    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "ready",
        previewStatus: "completed",
        totalSignals: 3,
        filteredCount: 0,
      }),
    ).toBe("filter_empty");
  });

  it("returns signals_available when filtered signals exist", () => {
    expect(
      resolveProviderInsightsTimelineViewState({
        previewUiState: "ready",
        previewStatus: "completed",
        totalSignals: 3,
        filteredCount: 2,
      }),
    ).toBe("signals_available");
  });
});

describe("buildProviderInsightsTimelineSummaryView", () => {
  it("maps ProviderDerivedSignalSummary fields to timeline summary", () => {
    const summary = buildProviderInsightsTimelineSummaryView({
      totalSignals: 10,
      gmailSignalCount: 4,
      calendarSignalCount: 3,
      correlationSignalCount: 2,
      lowConfidenceSignalCount: 1,
      reviewRequiredCount: 10,
      companies: ["acme.com"],
      kinds: ["provider_email_activity"],
      hasInterviewSignal: false,
      hasPendingActionSignal: false,
      hasOfferSignal: false,
      hasRejectionSignal: false,
    });

    expect(summary).toEqual({
      total: 10,
      gmail: 4,
      calendar: 3,
      correlation: 2,
      lowConfidence: 1,
      reviewRequired: 10,
    });
  });
});
