import { describe, expect, it } from "vitest";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import {
  clearProviderDerivedSignalSelection,
  createInitialProviderDerivedRuntimeReviewState,
  createProviderDerivedPreviewFingerprint,
  dismissProviderDerivedSignal,
  initializeProviderDerivedRuntimeReview,
  isProviderDerivedSignalReviewable,
  markProviderDerivedSelectionReady,
  restoreDismissedProviderDerivedSignal,
  selectAllReviewableProviderDerivedSignals,
  syncReviewStateWithPreview,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "./provider-derived-runtime-review-state";

function createSignal(overrides: Partial<ProviderDerivedSignal> = {}): ProviderDerivedSignal {
  return {
    id: "signal-1",
    source: "gmail",
    kind: "interview_likely",
    occurredAt: "2026-06-01T10:00:00.000Z",
    confidence: 0.8,
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
    processedMessageCount: 1,
    processedEventCount: 1,
    signals: [createSignal()],
    ...overrides,
  };
}

describe("createInitialProviderDerivedRuntimeReviewState", () => {
  it("returns empty idle state", () => {
    expect(createInitialProviderDerivedRuntimeReviewState()).toEqual({
      sourcePreviewFingerprint: null,
      selectedSignalIds: [],
      dismissedSignalIds: [],
      reviewStatus: "idle",
    });
  });
});

describe("initializeProviderDerivedRuntimeReview", () => {
  it("initializes completed preview with reviewing status", () => {
    const state = initializeProviderDerivedRuntimeReview(createPreviewResult());

    expect(state.reviewStatus).toBe("reviewing");
    expect(state.selectedSignalIds).toEqual([]);
    expect(state.sourcePreviewFingerprint).toBeTruthy();
  });

  it("initializes partial preview with reviewing status", () => {
    const state = initializeProviderDerivedRuntimeReview(
      createPreviewResult({ status: "partial", signals: [createSignal({ id: "signal-2" })] }),
    );

    expect(state.reviewStatus).toBe("reviewing");
  });

  it("returns empty state for blocked preview", () => {
    expect(initializeProviderDerivedRuntimeReview(createPreviewResult({ status: "blocked" }))).toEqual(
      createInitialProviderDerivedRuntimeReviewState(),
    );
  });

  it("returns empty state for error preview", () => {
    expect(initializeProviderDerivedRuntimeReview(createPreviewResult({ status: "error" }))).toEqual(
      createInitialProviderDerivedRuntimeReviewState(),
    );
  });
});

describe("createProviderDerivedPreviewFingerprint", () => {
  it("is deterministic for the same preview", () => {
    const preview = createPreviewResult({
      signals: [
        createSignal({ id: "b" }),
        createSignal({ id: "a", source: "calendar", kind: "interview_scheduled", startsAt: "2026-06-02T10:00:00.000Z" }),
      ],
    });

    expect(createProviderDerivedPreviewFingerprint(preview)).toBe(
      createProviderDerivedPreviewFingerprint(preview),
    );
  });

  it("changes when preview content changes", () => {
    const first = createProviderDerivedPreviewFingerprint(createPreviewResult());
    const second = createProviderDerivedPreviewFingerprint(
      createPreviewResult({ processedMessageCount: 2 }),
    );

    expect(first).not.toBe(second);
  });
});

describe("isProviderDerivedSignalReviewable", () => {
  it("accepts valid review-required signals", () => {
    expect(isProviderDerivedSignalReviewable(createSignal())).toBe(true);
  });

  it("rejects signals without reviewRequired", () => {
    expect(
      isProviderDerivedSignalReviewable({
        ...createSignal(),
        reviewRequired: false,
      } as unknown as ProviderDerivedSignal),
    ).toBe(false);
  });

  it("rejects invalid signal shapes", () => {
    expect(isProviderDerivedSignalReviewable({ id: "" })).toBe(false);
    expect(isProviderDerivedSignalReviewable(null)).toBe(false);
  });
});

describe("selection helpers", () => {
  const signals = [
    createSignal({ id: "a" }),
    createSignal({ id: "b", source: "calendar", kind: "offer_likely" }),
  ];
  const initialized = initializeProviderDerivedRuntimeReview(
    createPreviewResult({ signals }),
  );

  it("toggles selection on and off without duplicating IDs", () => {
    const selected = toggleProviderDerivedSignalSelection(initialized, "a", signals);
    expect(selected.selectedSignalIds).toEqual(["a"]);

    const toggledOff = toggleProviderDerivedSignalSelection(selected, "a", signals);
    expect(toggledOff.selectedSignalIds).toEqual([]);
  });

  it("keeps selected IDs sorted and unique", () => {
    const withB = toggleProviderDerivedSignalSelection(initialized, "b", signals);
    const withBoth = toggleProviderDerivedSignalSelection(withB, "a", signals);

    expect(withBoth.selectedSignalIds).toEqual(["a", "b"]);

    const selectedAgain = selectAllReviewableProviderDerivedSignals(withBoth, signals);
    expect(selectedAgain.selectedSignalIds).toEqual(["a", "b"]);
    expect(toggleProviderDerivedSignalSelection(withBoth, "a", signals).selectedSignalIds).toEqual(["b"]);
  });

  it("selects all reviewable non-dismissed signals", () => {
    const allSignals = [
      ...signals,
      createSignal({ id: "c", reviewRequired: true, source: "calendar", kind: "follow_up_required" }),
    ];
    const dismissedOne = dismissProviderDerivedSignal(initialized, "a", allSignals);
    const selected = selectAllReviewableProviderDerivedSignals(dismissedOne, allSignals);

    expect(selected.selectedSignalIds).toEqual(["b", "c"]);
  });

  it("clears selection", () => {
    const selected = toggleProviderDerivedSignalSelection(initialized, "a", signals);
    expect(clearProviderDerivedSignalSelection(selected).selectedSignalIds).toEqual([]);
  });
});

describe("dismiss and restore helpers", () => {
  const preview = createPreviewResult();
  const signals = preview.signals;
  const initialized = initializeProviderDerivedRuntimeReview(preview);

  it("dismiss removes signal from selection and tracks dismissed IDs", () => {
    const selected = toggleProviderDerivedSignalSelection(initialized, "signal-1", signals);
    const dismissed = dismissProviderDerivedSignal(selected, "signal-1", signals);

    expect(dismissed.selectedSignalIds).toEqual([]);
    expect(dismissed.dismissedSignalIds).toEqual(["signal-1"]);
  });

  it("restore removes dismissed ID without auto-selecting", () => {
    const dismissed = dismissProviderDerivedSignal(initialized, "signal-1", signals);
    const restored = restoreDismissedProviderDerivedSignal(dismissed, "signal-1");

    expect(restored.dismissedSignalIds).toEqual([]);
    expect(restored.selectedSignalIds).toEqual([]);
  });

  it("ignores unknown IDs", () => {
    expect(dismissProviderDerivedSignal(initialized, "missing", signals)).toEqual(initialized);
    expect(restoreDismissedProviderDerivedSignal(initialized, "missing")).toEqual(initialized);
    expect(toggleProviderDerivedSignalSelection(initialized, "missing", signals).selectedSignalIds).toEqual(
      [],
    );
  });

  it("does not select dismissed signals", () => {
    const dismissed = dismissProviderDerivedSignal(initialized, "signal-1", signals);
    expect(toggleProviderDerivedSignalSelection(dismissed, "signal-1", signals).selectedSignalIds).toEqual(
      [],
    );
  });
});

describe("markProviderDerivedSelectionReady", () => {
  it("requires at least one selected signal", () => {
    const initialized = initializeProviderDerivedRuntimeReview(createPreviewResult());
    expect(markProviderDerivedSelectionReady(initialized)).toEqual(initialized);
  });

  it("marks selection ready when signals are selected", () => {
    const preview = createPreviewResult();
    const selected = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      "signal-1",
      preview.signals,
    );

    expect(markProviderDerivedSelectionReady(selected).reviewStatus).toBe("selection_ready");
  });
});

describe("syncReviewStateWithPreview", () => {
  it("clears review while preview is loading", () => {
    const preview = createPreviewResult();
    const current = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      "signal-1",
      preview.signals,
    );

    expect(
      syncReviewStateWithPreview(current, {
        result: createPreviewResult(),
        isPreviewLoading: true,
      }),
    ).toEqual(createInitialProviderDerivedRuntimeReviewState());
  });

  it("clears review for blocked and error results", () => {
    const current = initializeProviderDerivedRuntimeReview(createPreviewResult());

    expect(
      syncReviewStateWithPreview(current, {
        result: createPreviewResult({ status: "blocked" }),
        isPreviewLoading: false,
      }),
    ).toEqual(createInitialProviderDerivedRuntimeReviewState());

    expect(
      syncReviewStateWithPreview(current, {
        result: createPreviewResult({ status: "error" }),
        isPreviewLoading: false,
      }),
    ).toEqual(createInitialProviderDerivedRuntimeReviewState());
  });

  it("reinitializes when fingerprint changes", () => {
    const preview = createPreviewResult();
    const current = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      "signal-1",
      preview.signals,
    );

    const synced = syncReviewStateWithPreview(current, {
      result: createPreviewResult({ processedEventCount: 3 }),
      isPreviewLoading: false,
    });

    expect(synced.selectedSignalIds).toEqual([]);
    expect(synced.reviewStatus).toBe("reviewing");
    expect(synced.sourcePreviewFingerprint).not.toBe(current.sourcePreviewFingerprint);
  });

  it("preserves state when fingerprint is unchanged", () => {
    const preview = createPreviewResult();
    const current = toggleProviderDerivedSignalSelection(
      initializeProviderDerivedRuntimeReview(preview),
      "signal-1",
      preview.signals,
    );

    expect(
      syncReviewStateWithPreview(current, {
        result: preview,
        isPreviewLoading: false,
      }),
    ).toEqual(current);
  });
});

describe("immutability", () => {
  it("does not mutate input state objects", () => {
    const initial = initializeProviderDerivedRuntimeReview(createPreviewResult());
    const frozen = structuredClone(initial);

    const signals = createPreviewResult().signals;

    toggleProviderDerivedSignalSelection(initial, "signal-1", signals);
    dismissProviderDerivedSignal(initial, "signal-1", signals);
    clearProviderDerivedSignalSelection(initial);
    markProviderDerivedSelectionReady(initial);

    expect(initial).toEqual(frozen);
  });
});
