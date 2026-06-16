import { describe, expect, it } from "vitest";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { createProviderDerivedSignalId } from "@devflow/career-sync";
import {
  createInitialProviderDerivedRuntimeReviewState,
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import {
  assertProviderCareerInsightsViewModelSafe,
  deriveProviderCareerInsights,
} from "./provider-derived-career-insights";

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

function createSignal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id" | "source" | "kind" | "occurredAt">,
): ProviderDerivedSignal {
  return {
    confidence: 0.85,
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

const gmailSignalId =
  createProviderDerivedSignalId({
    source: "gmail",
    kind: "follow_up_required",
    occurredAt: "2026-06-12T10:00:00.000Z",
    sequence: 1,
  }) ?? "gmail-id";

const calendarSignalId =
  createProviderDerivedSignalId({
    source: "calendar",
    kind: "interview_scheduled",
    occurredAt: "2026-06-20T14:00:00.000Z",
    sequence: 1,
  }) ?? "calendar-id";

function createPreviewResult(): ProviderDerivedRuntimeReviewablePreviewResult {
  return {
    status: "completed",
    processedMessageCount: 2,
    processedEventCount: 1,
    signals: [
      createSignal({
        id: gmailSignalId,
        source: "gmail",
        kind: "follow_up_required",
        occurredAt: "2026-06-12T10:00:00.000Z",
        company: "Acme",
      }),
      createSignal({
        id: calendarSignalId,
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-20T14:00:00.000Z",
        company: "Beta",
      }),
    ],
  };
}

function baseInput(overrides: Partial<Parameters<typeof deriveProviderCareerInsights>[0]> = {}) {
  return {
    explicitConsentChecked: true,
    gmailVerification: connectedVerification("gmail"),
    calendarVerification: connectedVerification("calendar"),
    previewUiState: "completed" as const,
    previewResult: null,
    reviewState: createInitialProviderDerivedRuntimeReviewState(),
    proposal: null,
    ...overrides,
  };
}

describe("deriveProviderCareerInsights", () => {
  it("returns no_valid_connection without consent", () => {
    const viewModel = deriveProviderCareerInsights(
      baseInput({ explicitConsentChecked: false }),
    );

    expect(viewModel.phase).toBe("no_valid_connection");
    expect(viewModel.metrics).toBeNull();
    expect(viewModel.appliedToCareerBundle).toBe(false);
    expect(viewModel.appliedToApplications).toBe(false);
    expect(viewModel.persisted).toBe(false);
  });

  it("returns connected_idle before preview run", () => {
    const viewModel = deriveProviderCareerInsights(baseInput());

    expect(viewModel.phase).toBe("connected_idle");
    expect(viewModel.metrics).toBeNull();
  });

  it("returns preview_without_signals when preview has no reviewable signals", () => {
    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: {
          status: "completed",
          processedMessageCount: 0,
          processedEventCount: 0,
          signals: [],
        },
        reviewState: initializeProviderDerivedRuntimeReview({
          status: "completed",
          processedMessageCount: 0,
          processedEventCount: 0,
          signals: [],
        }),
      }),
    );

    expect(viewModel.phase).toBe("preview_without_signals");
    expect(viewModel.metrics?.reviewableSignals).toBe(0);
  });

  it("counts selected and unselected signals", () => {
    const preview = createPreviewResult();
    const reviewState = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      gmailSignalId,
      preview.signals,
    );

    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: preview,
        reviewState,
      }),
    );

    expect(viewModel.phase).toBe("review_in_progress");
    expect(viewModel.metrics?.selectedCount).toBe(1);
    expect(viewModel.metrics?.unselectedCount).toBe(1);
  });

  it("returns selection_ready when review is marked ready", () => {
    const preview = createPreviewResult();
    const selected = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      gmailSignalId,
      preview.signals,
    );

    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: preview,
        reviewState: markProviderDerivedSelectionReady(selected),
      }),
    );

    expect(viewModel.phase).toBe("selection_ready");
    expect(viewModel.reviewStatus).toBe("selection_ready");
  });

  it("returns proposal_ready when proposal is built but not exportable", () => {
    const preview = createPreviewResult();
    const selected = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      gmailSignalId,
      preview.signals,
    );
    const reviewState = markProviderDerivedSelectionReady(selected);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt: "2026-06-15T12:00:00.000Z",
    });

    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: preview,
        reviewState,
        proposal: { ...proposal, enrichment: undefined },
      }),
    );

    expect(viewModel.phase).toBe("proposal_ready");
    expect(viewModel.proposalStatus).toBe("ready");
    expect(viewModel.exportAvailable).toBe(false);
  });

  it("returns export_available when proposal can be exported", () => {
    const preview = createPreviewResult();
    let reviewState = initializeProviderDerivedRuntimeReview(preview);
    reviewState = toggleProviderDerivedSignalSelection(reviewState, gmailSignalId, preview.signals);
    reviewState = toggleProviderDerivedSignalSelection(
      reviewState,
      calendarSignalId,
      preview.signals,
    );
    reviewState = markProviderDerivedSelectionReady(reviewState);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt: "2026-06-15T12:00:00.000Z",
    });

    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: preview,
        reviewState,
        proposal,
      }),
    );

    expect(viewModel.phase).toBe("export_available");
    expect(viewModel.exportAvailable).toBe(true);
  });

  it("includes privacy warnings from preview result", () => {
    const preview = createPreviewResult();
    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: {
          ...preview,
          warnings: ["partial_window"],
        } as unknown as typeof preview,
        reviewState: initializeProviderDerivedRuntimeReview(preview),
      }),
    );

    expect(viewModel.privacyWarnings).toContain("partial_window");
  });

  it("does not mutate input objects", () => {
    const preview = createPreviewResult();
    const reviewState = initializeProviderDerivedRuntimeReview(preview);
    const input = baseInput({ previewResult: preview, reviewState });

    deriveProviderCareerInsights(input);

    expect(input.reviewState.selectedSignalIds).toEqual([]);
    expect(preview.signals).toHaveLength(2);
  });

  it("passes forbidden-key safety assertion", () => {
    const preview = createPreviewResult();
    const reviewState = markProviderDerivedSelectionReady(
      toggleProviderDerivedSignalSelection(
        initializeProviderDerivedRuntimeReview(preview),
        gmailSignalId,
        preview.signals,
      ),
    );

    const viewModel = deriveProviderCareerInsights(
      baseInput({
        previewResult: preview,
        reviewState,
      }),
    );

    expect(() => assertProviderCareerInsightsViewModelSafe(viewModel)).not.toThrow();
    expect(JSON.stringify(viewModel)).not.toMatch(
      /access_token|connectionId|providerId|messageId|subject|snippet|body|description|location|meetingLink/i,
    );
  });
});
