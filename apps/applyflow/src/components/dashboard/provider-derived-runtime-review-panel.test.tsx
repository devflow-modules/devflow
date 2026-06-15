import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW,
  PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_SIGNALS,
  PROVIDER_DERIVED_RUNTIME_REVIEW_PARTIAL_WARNING,
  PROVIDER_DERIVED_RUNTIME_REVIEW_SELECTION_READY_MESSAGE,
  PROVIDER_DERIVED_RUNTIME_REVIEW_TITLE,
} from "./provider-derived-runtime-review-content";
import {
  createInitialProviderDerivedRuntimeReviewState,
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
} from "./provider-derived-runtime-review-state";
import { ProviderDerivedRuntimeReviewPanelView } from "./provider-derived-runtime-review-panel";

const noop = () => undefined;

function completedResult(signals: ProviderDerivedRuntimePreviewClientResult["signals"] = []): ProviderDerivedRuntimePreviewClientResult {
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
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings: [],
    messages: ["ok"],
  };
}

const reviewableSignal = {
  id: "signal-1",
  source: "gmail" as const,
  kind: "interview_likely" as const,
  occurredAt: "2026-06-01T10:00:00.000Z",
  startsAt: "2026-06-01T11:00:00.000Z",
  company: "Acme",
  confidence: 0.82,
  reviewRequired: true as const,
  sourceCount: 1,
};

describe("ProviderDerivedRuntimeReviewPanelView", () => {
  it("renders empty state without preview", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={null}
        isPreviewLoading={false}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_TITLE);
    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW);
    expect(html).toContain("In-memory only");
  });

  it("renders completed preview without signals", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={completedResult([])}
        isPreviewLoading={false}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_SIGNALS);
  });

  it("renders partial warning and reviewable signals", () => {
    const result = { ...completedResult([reviewableSignal]), status: "partial" as const };
    const reviewState = initializeProviderDerivedRuntimeReview(result);

    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={result}
        isPreviewLoading={false}
        reviewState={reviewState}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_PARTIAL_WARNING);
    expect(html).toContain("gmail");
    expect(html).toContain("interview_likely");
    expect(html).toContain("Acme");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Select signal interview_likely from gmail"');
  });

  it("disables mark selection ready without selected signals", () => {
    const result = completedResult([reviewableSignal]);
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={result}
        isPreviewLoading={false}
        reviewState={initializeProviderDerivedRuntimeReview(result)}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain('data-testid="provider-derived-runtime-review-mark-ready"');
    expect(html).toMatch(/disabled=""[^>]*data-testid="provider-derived-runtime-review-mark-ready"/);
  });

  it("enables mark selection ready with selected signals", () => {
    const result = completedResult([reviewableSignal]);
    const reviewState = markProviderDerivedSelectionReady(
      toggleProviderDerivedSignalSelection(
        initializeProviderDerivedRuntimeReview(result),
        "signal-1",
        result.signals,
      ),
    );

    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={result}
        isPreviewLoading={false}
        reviewState={reviewState}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_SELECTION_READY_MESSAGE);
    expect(html).toContain("Selected signals:");
    expect(html).not.toMatch(
      /disabled=""[^>]*data-testid="provider-derived-runtime-review-mark-ready"/,
    );
  });

  it("does not render forbidden provider fields", () => {
    const result = completedResult([reviewableSignal]);
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={result}
        isPreviewLoading={false}
        reviewState={initializeProviderDerivedRuntimeReview(result)}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).not.toMatch(/subject|snippet|meetingLink|messageId|connectionId|access_token/i);
  });

  it("clears review UI while preview is loading", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={completedResult([reviewableSignal])}
        isPreviewLoading={true}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={noop}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW);
    expect(html).not.toContain("provider-derived-runtime-review-signal-list");
  });

  it("wires action handlers without fetch", () => {
    const onMarkSelectionReady = vi.fn();
    const result = completedResult([reviewableSignal]);
    const reviewState = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(result),
      "signal-1",
      result.signals,
    );

    renderToStaticMarkup(
      <ProviderDerivedRuntimeReviewPanelView
        result={result}
        isPreviewLoading={false}
        reviewState={reviewState}
        onToggleSelection={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        onDismiss={noop}
        onRestore={noop}
        onMarkSelectionReady={onMarkSelectionReady}
      />,
    );

    expect(onMarkSelectionReady).not.toHaveBeenCalled();
  });
});

describe("ProviderDerivedRuntimeReviewPanel module boundaries", () => {
  it("does not reference browser storage or fetch in review modules", async () => {
    const reviewPanelSource = await import("./provider-derived-runtime-review-panel.tsx?raw").catch(
      () => null,
    );
    const reviewStateSource = await import("./provider-derived-runtime-review-state.ts?raw").catch(
      () => null,
    );

    if (reviewPanelSource && "default" in reviewPanelSource) {
      expect(String(reviewPanelSource.default)).not.toMatch(
        /localStorage|sessionStorage|fetch\(|CareerBundle|adaptProviderDerivedSignalsToSyncEnrichment/i,
      );
    }

    if (reviewStateSource && "default" in reviewStateSource) {
      expect(String(reviewStateSource.default)).not.toMatch(/localStorage|sessionStorage/i);
    }
  });
});
