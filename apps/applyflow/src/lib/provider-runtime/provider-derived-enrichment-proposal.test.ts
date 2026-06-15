import { describe, expect, it } from "vitest";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import {
  createProviderDerivedPreviewFingerprint,
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewState,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import {
  buildProviderDerivedEnrichmentProposal,
  selectProviderDerivedSignalsForProposal,
  validateReviewSelectionForProposal,
} from "./provider-derived-enrichment-proposal";

const generatedAt = "2026-06-15T12:00:00.000Z";

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

function createPreviewResult(
  overrides: Partial<ProviderDerivedRuntimeReviewablePreviewResult> = {},
): ProviderDerivedRuntimeReviewablePreviewResult {
  return {
    status: "completed",
    processedMessageCount: 2,
    processedEventCount: 1,
    signals: [
      createSignal({
        id: "gmail-follow-up",
        source: "gmail",
        kind: "follow_up_required",
        occurredAt: "2026-06-12T10:00:00.000Z",
        company: "Acme",
      }),
      createSignal({
        id: "calendar-interview",
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-20T14:00:00.000Z",
        startsAt: "2026-06-20T14:00:00.000Z",
        company: "Beta",
      }),
      createSignal({
        id: "gmail-offer",
        source: "gmail",
        kind: "offer_likely",
        occurredAt: "2026-06-10T08:00:00.000Z",
        company: "Gamma",
      }),
    ],
    ...overrides,
  };
}

function readyReviewState(preview: ProviderDerivedRuntimeReviewablePreviewResult): ProviderDerivedRuntimeReviewState {
  const initialized = initializeProviderDerivedRuntimeReview(preview);
  const selected = toggleProviderDerivedSignalSelection(initialized, "gmail-follow-up", preview.signals);
  const selectedBoth = toggleProviderDerivedSignalSelection(selected, "calendar-interview", preview.signals);
  return markProviderDerivedSelectionReady(selectedBoth);
}

describe("validateReviewSelectionForProposal", () => {
  it("accepts selection_ready with matching fingerprint", () => {
    const preview = createPreviewResult();
    const reviewState = readyReviewState(preview);

    expect(validateReviewSelectionForProposal({ previewResult: preview, reviewState, generatedAt })).toEqual(
      [],
    );
  });

  it("rejects idle and reviewing states", () => {
    const preview = createPreviewResult();
    const initialized = initializeProviderDerivedRuntimeReview(preview);

    expect(
      validateReviewSelectionForProposal({
        previewResult: preview,
        reviewState: initialized,
        generatedAt,
      }),
    ).toContain("review_not_ready");
  });

  it("rejects fingerprint mismatch", () => {
    const preview = createPreviewResult();
    const reviewState = {
      ...readyReviewState(preview),
      sourcePreviewFingerprint: "stale-fingerprint",
    };

    expect(
      validateReviewSelectionForProposal({ previewResult: preview, reviewState, generatedAt }),
    ).toContain("preview_fingerprint_mismatch");
  });

  it("rejects missing and dismissed selected IDs", () => {
    const preview = createPreviewResult();
    const reviewState = {
      ...readyReviewState(preview),
      selectedSignalIds: ["missing-id", "gmail-follow-up", "calendar-interview"],
      dismissedSignalIds: ["calendar-interview"],
    };

    const warnings = validateReviewSelectionForProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    expect(warnings).toContain("selected_signal_not_found");
    expect(warnings).toContain("selected_signal_dismissed");
  });
});

describe("selectProviderDerivedSignalsForProposal", () => {
  it("returns only selected reviewable signals in deterministic order", () => {
    const preview = createPreviewResult();
    const reviewState = readyReviewState(preview);
    const selected = selectProviderDerivedSignalsForProposal(preview.signals, reviewState);

    expect(selected.map((signal) => signal.id)).toEqual(["gmail-follow-up", "calendar-interview"]);
  });

  it("does not duplicate signals for repeated IDs", () => {
    const preview = createPreviewResult();
    const reviewState = {
      ...readyReviewState(preview),
      selectedSignalIds: ["gmail-follow-up", "gmail-follow-up", "calendar-interview"],
    };

    expect(selectProviderDerivedSignalsForProposal(preview.signals, reviewState)).toHaveLength(2);
  });
});

describe("buildProviderDerivedEnrichmentProposal", () => {
  it("builds ready proposal from valid selection_ready review", () => {
    const preview = createPreviewResult();
    const reviewState = readyReviewState(preview);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    expect(proposal.status).toBe("ready");
    expect(proposal.sourceSignalCount).toBe(2);
    expect(proposal.generatedAt).toBe(generatedAt);
    expect(proposal.persisted).toBe(false);
    expect(proposal.appliedToCareerBundle).toBe(false);
    expect(proposal.appliedToApplications).toBe(false);
    expect(proposal.enrichment?.stats.totalSignals).toBe(2);
    expect(proposal.enrichment?.stats.companyHints).toEqual(["Acme", "Beta"]);
    expect(proposal.enrichment?.stats.sourceCounts.gmail).toBe(1);
    expect(proposal.enrichment?.stats.sourceCounts.calendar).toBe(1);
    expect(proposal.messages[0]).toMatch(/Nothing has been saved or applied/i);
  });

  it("returns invalid when review is not ready", () => {
    const preview = createPreviewResult();
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState: initializeProviderDerivedRuntimeReview(preview),
      generatedAt,
    });

    expect(proposal.status).toBe("invalid");
    expect(proposal.enrichment).toBeUndefined();
    expect(proposal.warnings).toContain("review_not_ready");
    expect(proposal.messages[0]).toMatch(/not ready for an enrichment proposal/i);
  });

  it("returns invalid when no signals are selected", () => {
    const preview = createPreviewResult();
    const reviewState = {
      ...initializeProviderDerivedRuntimeReview(preview),
      reviewStatus: "selection_ready" as const,
      sourcePreviewFingerprint: createProviderDerivedPreviewFingerprint(preview),
    };

    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    expect(proposal.status).toBe("invalid");
    expect(proposal.warnings).toContain("no_selected_signals");
  });

  it("excludes non-selected signals from enrichment", () => {
    const preview = createPreviewResult();
    const reviewState = markProviderDerivedSelectionReady(
      toggleProviderDerivedSignalSelection(
        initializeProviderDerivedRuntimeReview(preview),
        "gmail-follow-up",
        preview.signals,
      ),
    );

    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    expect(proposal.status).toBe("ready");
    expect(proposal.sourceSignalCount).toBe(1);
    expect(proposal.enrichment?.combinedSignals).toHaveLength(1);
    expect(proposal.enrichment?.combinedSignals[0]?.source).toBe("gmail");
    expect(proposal.enrichment?.stats.companyHints).toEqual(["Acme"]);
  });

  it("keeps offer and rejection likely non-authoritative", () => {
    const preview = createPreviewResult();
    const reviewState = markProviderDerivedSelectionReady(
      toggleProviderDerivedSignalSelection(
        initializeProviderDerivedRuntimeReview(preview),
        "gmail-offer",
        preview.signals,
      ),
    );

    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    expect(proposal.status).toBe("ready");
    expect(proposal.enrichment?.combinedSignals[0]?.safeSummary).toMatch(/offer likely/i);
  });

  it("keeps interview_likely without eventAt and interview_scheduled with eventAt", () => {
    const preview = createPreviewResult({
      signals: [
        createSignal({
          id: "gmail-interview-likely",
          source: "gmail",
          kind: "interview_likely",
          occurredAt: "2026-06-18T10:00:00.000Z",
        }),
        createSignal({
          id: "calendar-interview",
          source: "calendar",
          kind: "interview_scheduled",
          occurredAt: "2026-06-20T14:00:00.000Z",
          startsAt: "2026-06-20T14:00:00.000Z",
        }),
      ],
    });
    const initialized = initializeProviderDerivedRuntimeReview(preview);
    const selected = toggleProviderDerivedSignalSelection(initialized, "gmail-interview-likely", preview.signals);
    const selectedBoth = toggleProviderDerivedSignalSelection(selected, "calendar-interview", preview.signals);
    const reviewState = markProviderDerivedSelectionReady(selectedBoth);

    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt,
    });

    const gmailSignal = proposal.enrichment?.combinedSignals.find((signal) => signal.source === "gmail");
    const calendarSignal = proposal.enrichment?.combinedSignals.find(
      (signal) => signal.source === "calendar",
    );

    expect(gmailSignal?.eventAt).toBeUndefined();
    expect(calendarSignal?.eventAt).toBe("2026-06-20T14:00:00.000Z");
  });

  it("is deterministic for the same input", () => {
    const preview = createPreviewResult();
    const reviewState = readyReviewState(preview);
    const input = { previewResult: preview, reviewState, generatedAt };

    expect(buildProviderDerivedEnrichmentProposal(input)).toEqual(
      buildProviderDerivedEnrichmentProposal(input),
    );
  });

  it("does not mutate preview or review state inputs", () => {
    const preview = createPreviewResult();
    const reviewState = readyReviewState(preview);
    const frozenPreview = structuredClone(preview);
    const frozenReview = structuredClone(reviewState);

    buildProviderDerivedEnrichmentProposal({ previewResult: preview, reviewState, generatedAt });

    expect(preview).toEqual(frozenPreview);
    expect(reviewState).toEqual(frozenReview);
  });

  it("keeps privacy flags safe in ready proposals", () => {
    const preview = createPreviewResult();
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState: readyReviewState(preview),
      generatedAt,
    });

    expect(proposal.enrichment?.privacy.rawRetained).toBe(false);
    expect(proposal.enrichment?.privacy.redacted).toBe(true);
    expect(proposal.enrichment?.privacy.meetingLinksRemoved).toBe(true);
    expect(proposal.enrichment?.privacy.providerPayloadRetained).toBe(false);
    expect(proposal.enrichment?.privacy.userReviewRequired).toBe(true);
    expect(proposal.enrichment?.combinedSignals.every((signal) => signal.rawRetained === false)).toBe(
      true,
    );
    expect(proposal.enrichment?.combinedSignals.every((signal) => signal.providerId == null)).toBe(
      true,
    );
  });
});
