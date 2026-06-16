import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_DEMO,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE,
} from "./provider-derived-enrichment-change-preview-content";
import { ProviderDerivedEnrichmentChangePreviewPanel } from "./provider-derived-enrichment-change-preview-panel";
import { createInitialProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";
import { buildApplyFlowDemoSyncEnrichment } from "@/lib/career-bundle-demo-sync-enrichment";
import type { ProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";

function readyProposal(
  enrichment: NonNullable<ProviderDerivedEnrichmentProposal["enrichment"]>,
): ProviderDerivedEnrichmentProposal {
  return {
    status: "ready",
    sourcePreviewFingerprint: "fp-1",
    selectedSignalIds: ["signal-1"],
    sourceSignalCount: 1,
    generatedAt: "2026-06-15T12:00:00.000Z",
    enrichment,
    warnings: [],
    messages: [],
    safeForClient: true,
    ephemeral: true,
    userReviewRequired: true,
    persisted: false,
    appliedToCareerBundle: false,
    appliedToApplications: false,
  };
}

describe("ProviderDerivedEnrichmentChangePreviewPanel render", () => {
  it("renders empty proposal state without apply or save actions", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentChangePreviewPanel
        proposal={null}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        exportAvailable={false}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE);
    expect(html).toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE);
    expect(html).not.toMatch(/data-testid="[^"]*apply|>Apply<|>Save<|Confirm changes|Update profile|Synchronize/i);
    expect(html).not.toMatch(/access_token|connectionId|providerPayload/i);
  });

  it("renders no-baseline notice when currentSyncEnrichment is absent", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentChangePreviewPanel
        proposal={null}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        exportAvailable={false}
      />,
    );

    expect(html).toContain("No current sync enrichment was found in this session");
    expect(html).toContain("empty baseline");
    expect(html).not.toContain("provider-derived sync enrichment composed");
    expect(html).not.toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_DEMO);
  });

  it("renders baseline-available notice when currentSyncEnrichment is provided", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const html = renderToStaticMarkup(
      <ProviderDerivedEnrichmentChangePreviewPanel
        currentSyncEnrichment={enrichment}
        baselineSourceKind="demo"
        proposal={readyProposal(enrichment)}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        exportAvailable={false}
      />,
    );

    expect(html).toContain("Comparing against demo sync enrichment");
    expect(html).not.toContain(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE);
    expect(html).not.toMatch(/data-testid="[^"]*apply|>Apply<|>Save<|Confirm changes|Update profile|Synchronize/i);
  });
});
