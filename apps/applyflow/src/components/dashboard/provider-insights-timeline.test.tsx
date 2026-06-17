import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_INSIGHTS_TIMELINE_DISCLAIMER,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_BLOCKED,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_FILTER,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_NO_PREVIEW,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_ZERO_SIGNALS,
  PROVIDER_INSIGHTS_TIMELINE_TITLE,
} from "./provider-insights-timeline-content";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import { ProviderInsightsTimelineView } from "./provider-insights-timeline";

const noop = () => undefined;

function createSignal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id">,
): ProviderDerivedSignal {
  return {
    source: "gmail",
    kind: "provider_email_activity",
    occurredAt: "2026-06-10T10:00:00.000Z",
    company: "acme.com",
    confidence: 0.85,
    confidenceLevel: "high",
    reason: "Recent email activity detected",
    reviewRequired: true,
    sourceCount: 2,
    ...overrides,
  };
}

function completedResult(
  signals: ProviderDerivedSignal[],
  summaryOverrides: Partial<ProviderDerivedRuntimePreviewClientResult["summary"]> = {},
): ProviderDerivedRuntimePreviewClientResult {
  return {
    runtime: "nango",
    status: "completed",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    gmailStatus: "completed",
    calendarStatus: "completed",
    processedMessageCount: signals.length,
    processedEventCount: 0,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedProviderIdentifiers: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    signals,
    summary: {
      ...createEmptyProviderDerivedSignalSummary(),
      totalSignals: signals.length,
      gmailSignalCount: signals.filter((signal) => signal.source === "gmail").length,
      calendarSignalCount: signals.filter((signal) => signal.source === "calendar").length,
      correlationSignalCount: signals.filter((signal) => signal.kind === "provider_activity_cluster").length,
      lowConfidenceSignalCount: signals.filter((signal) => signal.confidenceLevel === "low").length,
      reviewRequiredCount: signals.length,
      ...summaryOverrides,
    },
    warnings: [],
    messages: ["ok"],
  };
}

describe("ProviderInsightsTimelineView", () => {
  it("renders no preview state", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="idle"
        previewResult={null}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_TITLE);
    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_EMPTY_NO_PREVIEW);
    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_DISCLAIMER);
  });

  it("renders blocked state", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="blocked"
        previewResult={null}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_EMPTY_BLOCKED);
  });

  it("renders zero signals state", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([])}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_EMPTY_ZERO_SIGNALS);
  });

  it("renders filter empty state and filtered count", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([createSignal({ id: "gmail-only" })])}
        isPreviewLoading={false}
        activeFilter="calendar"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain('data-testid="provider-insights-timeline-filtered-count"');
    expect(html).toContain(PROVIDER_INSIGHTS_TIMELINE_EMPTY_FILTER);
    expect(html).not.toContain('data-testid="provider-insights-timeline-groups"');
  });

  it("renders summary, timeline groups, and filtered count for available signals", () => {
    const signals = [
      createSignal({ id: "gmail-1", occurredAt: "2026-06-10T10:00:00.000Z" }),
      createSignal({
        id: "calendar-1",
        source: "calendar",
        kind: "provider_calendar_activity",
        occurredAt: "2026-06-11T12:00:00.000Z",
        startsAt: "2026-06-11T13:00:00.000Z",
      }),
    ];

    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult(signals, {
          totalSignals: 2,
          gmailSignalCount: 1,
          calendarSignalCount: 1,
          reviewRequiredCount: 2,
        })}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain('data-testid="provider-insights-timeline-summary"');
    expect(html).toContain("Total:");
    expect(html).toContain("Gmail:");
    expect(html).toContain("Calendar:");
    expect(html).toContain('data-testid="provider-insights-timeline-day-2026-06-11"');
    expect(html).toContain('data-testid="provider-insights-timeline-day-2026-06-10"');
    expect(html).toContain('data-testid="provider-insights-timeline-groups"');
  });

  it("renders manual review badge and allowed signal fields", () => {
    const signal = createSignal({ id: "signal-card" });

    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([signal])}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain("gmail");
    expect(html).toContain("provider email activity");
    expect(html).toContain(signal.occurredAt);
    expect(html).not.toContain("Starts:");
    expect(html).toContain("acme.com");
    expect(html).toContain("high");
    expect(html).toContain(signal.reason ?? "");
    expect(html).toContain("Evidence count: 2");
    expect(html).toContain("Manual review");
  });

  it("renders startsAt when present on signal", () => {
    const signal = createSignal({
      id: "with-starts",
      startsAt: "2026-06-11T13:00:00.000Z",
    });

    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([signal])}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain("Starts: 2026-06-11T13:00:00.000Z");
  });

  it("does not render forbidden provider fields", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([createSignal({ id: "safe-signal" })])}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).not.toMatch(
      /subject|snippet|body|description|location|meetingLink|messageId|threadId|eventId|connectionId|access_token|refresh_token/i,
    );
  });

  it("exposes keyboard-accessible filter tabs with aria attributes", () => {
    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult([createSignal({ id: "signal-1" })])}
        isPreviewLoading={false}
        activeFilter="all"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-label="All filter"');
    expect(html).toContain('aria-labelledby="provider-insights-timeline-filter-label"');
    expect(html).toContain('aria-live="polite"');
  });

  it("shows filtered count for gmail filter", () => {
    const signals = [
      createSignal({ id: "gmail-1" }),
      createSignal({
        id: "calendar-1",
        source: "calendar",
        kind: "provider_calendar_activity",
      }),
    ];

    const html = renderToStaticMarkup(
      <ProviderInsightsTimelineView
        previewUiState="ready"
        previewResult={completedResult(signals)}
        isPreviewLoading={false}
        activeFilter="gmail"
        onFilterChange={noop}
      />,
    );

    expect(html).toContain('data-testid="provider-insights-timeline-signal-card-gmail-1"');
    expect(html).not.toContain('data-testid="provider-insights-timeline-signal-card-calendar-1"');
  });
});

describe("ProviderInsightsTimeline module boundaries", () => {
  it("does not reference browser storage, fetch, or mutation flows", async () => {
    const timelineSource = await import("./provider-insights-timeline.tsx?raw").catch(() => null);
    const libSource = await import("@/lib/provider-runtime/provider-insights-timeline.ts?raw").catch(
      () => null,
    );

    if (timelineSource && "default" in timelineSource) {
      expect(String(timelineSource.default)).not.toMatch(
        /localStorage|sessionStorage|fetch\(|CareerBundle|adaptProviderDerivedSignalsToSyncEnrichment|applyEnrichment/i,
      );
    }

    if (libSource && "default" in libSource) {
      expect(String(libSource.default)).not.toMatch(/localStorage|sessionStorage|fetch\(/i);
    }
  });
});
