import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import {
  buildProviderDerivedEnrichmentProposal,
  canBuildEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BUILD_LABEL,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_TITLE,
} from "./provider-derived-enrichment-proposal-content";
import { ProviderDerivedEnrichmentProposalPanelView } from "./provider-derived-enrichment-proposal-panel";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
} from "./provider-derived-runtime-review-state";

const generatedAt = "2026-06-15T12:00:00.000Z";

const reviewableSignal = {
  id: "signal-1",
  source: "gmail" as const,
  kind: "follow_up_required" as const,
  occurredAt: "2026-06-01T10:00:00.000Z",
  company: "Acme",
  confidence: 0.82,
  reviewRequired: true as const,
  sourceCount: 1,
};

function completedResult(
  signals: ProviderDerivedRuntimePreviewClientResult["signals"] = [],
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
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings: [],
    messages: ["ok"],
  };
}

function readyReviewState(result: ProviderDerivedRuntimePreviewClientResult) {
  return markProviderDerivedSelectionReady(
    toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(result),
      "signal-1",
      result.signals,
    ),
  );
}

describe("ProviderDerivedEnrichmentProposalPanelView", () => {
  it("disables build button without selection_ready review", () => {
    const result = completedResult([reviewableSignal]);
    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={result}
        reviewState={initializeProviderDerivedRuntimeReview(result)}
        isPreviewLoading={false}
        proposal={null}
        buildEnabled={false}
        onBuildProposal={() => undefined}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_TITLE);
    expect(html).toMatch(/disabled=""[^>]*data-testid="provider-derived-enrichment-proposal-build"/);
  });

  it("enables build button when selection is ready", () => {
    const result = completedResult([reviewableSignal]);
    const reviewState = readyReviewState(result);
    const buildEnabled = canBuildEnrichmentProposal({
      previewResult: result,
      reviewState,
      isPreviewLoading: false,
    });

    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={result}
        reviewState={reviewState}
        isPreviewLoading={false}
        proposal={null}
        buildEnabled={buildEnabled}
        onBuildProposal={() => undefined}
      />,
    );

    expect(buildEnabled).toBe(true);
    expect(html).not.toMatch(/disabled=""[^>]*data-testid="provider-derived-enrichment-proposal-build"/);
  });

  it("renders ready proposal summary with safe fields only", () => {
    const result = completedResult([reviewableSignal]);
    const reviewState = readyReviewState(result);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: result,
      reviewState,
      generatedAt,
    });

    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={result}
        reviewState={reviewState}
        isPreviewLoading={false}
        proposal={proposal}
        buildEnabled={true}
        onBuildProposal={() => undefined}
      />,
    );

    expect(html).toContain('data-testid="provider-derived-enrichment-proposal-summary"');
    expect(html).toContain("ready");
    expect(html).toContain("Acme");
    expect(html).toContain(generatedAt);
    expect(html).toContain("not saved and has not been applied");
    expect(html).not.toMatch(/subject|snippet|meetingLink|messageId|connectionId|access_token/i);
    expect(html).not.toMatch(/data-testid="provider-derived-enrichment-proposal-apply"/);
    expect(html).not.toMatch(/data-testid="provider-derived-enrichment-proposal-save"/);
    expect(html).not.toMatch(/data-testid="provider-derived-enrichment-proposal-export"/);
  });

  it("renders invalid proposal message safely", () => {
    const result = completedResult([reviewableSignal]);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: result,
      reviewState: initializeProviderDerivedRuntimeReview(result),
      generatedAt,
    });

    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={result}
        reviewState={initializeProviderDerivedRuntimeReview(result)}
        isPreviewLoading={false}
        proposal={proposal}
        buildEnabled={false}
        onBuildProposal={() => undefined}
      />,
    );

    expect(proposal.status).toBe("invalid");
    expect(html).toContain("not ready for an enrichment proposal");
  });

  it("does not invoke build handler from static render", () => {
    const onBuildProposal = vi.fn();
    const result = completedResult([reviewableSignal]);
    const reviewState = readyReviewState(result);

    renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={result}
        reviewState={reviewState}
        isPreviewLoading={false}
        proposal={null}
        buildEnabled={true}
        onBuildProposal={onBuildProposal}
      />,
    );

    expect(onBuildProposal).not.toHaveBeenCalled();
  });

  it("exposes accessible build button label", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentProposalPanelView
        previewResult={completedResult([reviewableSignal])}
        reviewState={readyReviewState(completedResult([reviewableSignal]))}
        isPreviewLoading={false}
        proposal={null}
        buildEnabled={true}
        onBuildProposal={() => undefined}
      />,
    );

    expect(html).toContain(`aria-label="${PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BUILD_LABEL}"`);
  });
});

describe("ProviderDerivedEnrichmentProposalPanel module boundaries", () => {
  it("does not reference browser storage, fetch, or persistence APIs", async () => {
    const panelSource = await import("./provider-derived-enrichment-proposal-panel.tsx?raw").catch(
      () => null,
    );
    const proposalSource = await import(
      "../lib/provider-runtime/provider-derived-enrichment-proposal.ts?raw"
    ).catch(() => null);

    if (panelSource && "default" in panelSource) {
      expect(String(panelSource.default)).not.toMatch(
        /localStorage|sessionStorage|fetch\(|axios|applyToCareerBundle|exportCareerBundle|prisma/i,
      );
    }

    if (proposalSource && "default" in proposalSource) {
      expect(String(proposalSource.default)).not.toMatch(/localStorage|sessionStorage|fetch\(/i);
    }
  });
});
