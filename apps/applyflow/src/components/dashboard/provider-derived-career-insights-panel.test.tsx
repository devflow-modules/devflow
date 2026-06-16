import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_DERIVED_CAREER_INSIGHTS_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_CAREER_INSIGHTS_TITLE,
} from "./provider-derived-career-insights-content";
import {
  ProviderDerivedCareerInsightsPanel,
  ProviderDerivedCareerInsightsPanelView,
} from "./provider-derived-career-insights-panel";
import { deriveProviderCareerInsights } from "@/lib/provider-runtime/provider-derived-career-insights";
import { createInitialProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";

const connectedVerification = (provider: "gmail" | "calendar") => ({
  provider,
  runtime: "nango" as const,
  state: "connected" as const,
  verifiedByServer: true as const,
  safeForClient: true as const,
  canSync: false as const,
  canImportProviderData: false as const,
  canPersistProviderPayload: false as const,
  hasToken: false as const,
  checkedAt: "2026-06-15T12:00:00.000Z",
  messages: ["verified"],
  warnings: [],
});

describe("ProviderDerivedCareerInsightsPanel render", () => {
  it("renders empty connection state summary", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedCareerInsightsPanel
        explicitConsentChecked={false}
        gmailVerification={null}
        calendarVerification={null}
        previewUiState="idle"
        previewResult={null}
        reviewState={createInitialProviderDerivedRuntimeReviewState()}
        proposal={null}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_CAREER_INSIGHTS_TITLE);
    expect(html).toContain(PROVIDER_DERIVED_CAREER_INSIGHTS_NO_CAREER_BUNDLE);
    expect(html).toContain("Connect Gmail and Calendar");
    expect(html).not.toMatch(/access_token|connectionId|providerPayload/i);
  });

  it("renders metrics when preview has signals", () => {
    const viewModel = deriveProviderCareerInsights({
      explicitConsentChecked: true,
      gmailVerification: connectedVerification("gmail"),
      calendarVerification: connectedVerification("calendar"),
      previewUiState: "completed",
      previewResult: {
        runtime: "nango",
        status: "completed",
        safeForClient: true,
        readOnly: true,
        userReviewRequired: true,
        gmailStatus: "completed",
        calendarStatus: "completed",
        processedMessageCount: 1,
        processedEventCount: 1,
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
        signals: [
          {
            id: "signal-1",
            source: "gmail",
            kind: "follow_up_required",
            occurredAt: "2026-06-12T10:00:00.000Z",
            confidence: 0.9,
            reviewRequired: true,
            sourceCount: 1,
            company: "Acme",
          },
        ],
        summary: {
          totalSignals: 1,
          gmailSignalCount: 1,
          calendarSignalCount: 0,
          reviewRequiredCount: 1,
          companies: ["Acme"],
          kinds: ["follow_up_required"],
          hasInterviewSignal: false,
          hasPendingActionSignal: true,
          hasOfferSignal: false,
          hasRejectionSignal: false,
        },
        warnings: ["privacy_safe_only"],
        messages: [],
      },
      reviewState: {
        sourcePreviewFingerprint: "fp",
        selectedSignalIds: [],
        dismissedSignalIds: [],
        reviewStatus: "reviewing",
      },
      proposal: null,
    });

    const html = renderToStaticMarkup(
      <ProviderDerivedCareerInsightsPanelView viewModel={viewModel} />,
    );

    expect(html).toContain('data-testid="provider-derived-career-insights-metrics"');
    expect(html).toContain("Available:");
    expect(html).toContain("privacy_safe_only");
    expect(html).toContain("Export available:");
  });

  it("renders export available state", () => {
    const viewModel = deriveProviderCareerInsights({
      explicitConsentChecked: true,
      gmailVerification: connectedVerification("gmail"),
      calendarVerification: connectedVerification("calendar"),
      previewUiState: "completed",
      previewResult: null,
      reviewState: createInitialProviderDerivedRuntimeReviewState(),
      proposal: null,
    });

    viewModel.phase = "export_available";
    viewModel.exportAvailable = true;

    const html = renderToStaticMarkup(
      <ProviderDerivedCareerInsightsPanelView viewModel={viewModel} />,
    );

    expect(html).toContain("Export available:");
    expect(html).toContain("yes");
  });
});
