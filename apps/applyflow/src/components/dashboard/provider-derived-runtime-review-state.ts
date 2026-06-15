import type { ProviderDerivedSignal } from "@devflow/career-sync";

export type ProviderDerivedRuntimeReviewStatus = "idle" | "reviewing" | "selection_ready";

export type ProviderDerivedRuntimeReviewState = {
  sourcePreviewFingerprint: string | null;
  selectedSignalIds: string[];
  dismissedSignalIds: string[];
  reviewStatus: ProviderDerivedRuntimeReviewStatus;
};

export type ProviderDerivedRuntimeReviewablePreviewResult = {
  status: "completed" | "partial" | "blocked" | "error";
  processedMessageCount: number;
  processedEventCount: number;
  signals: ProviderDerivedSignal[];
};

function sortUniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

export function isProviderDerivedSignalReviewable(signal: unknown): signal is ProviderDerivedSignal {
  if (signal == null || typeof signal !== "object") {
    return false;
  }

  const candidate = signal as Partial<ProviderDerivedSignal>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    (candidate.source === "gmail" || candidate.source === "calendar") &&
    typeof candidate.kind === "string" &&
    candidate.kind.length > 0 &&
    typeof candidate.occurredAt === "string" &&
    candidate.occurredAt.length > 0 &&
    typeof candidate.confidence === "number" &&
    Number.isFinite(candidate.confidence) &&
    candidate.reviewRequired === true
  );
}

export function createProviderDerivedPreviewFingerprint(
  result: Pick<
    ProviderDerivedRuntimeReviewablePreviewResult,
    "status" | "processedMessageCount" | "processedEventCount" | "signals"
  >,
): string {
  const signalParts = [...result.signals]
    .filter(isProviderDerivedSignalReviewable)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (signal) =>
        `${signal.id}|${signal.source}|${signal.kind}|${signal.occurredAt}|${signal.startsAt ?? ""}`,
    );

  return [
    result.status,
    String(result.processedMessageCount),
    String(result.processedEventCount),
    signalParts.join(";"),
  ].join("::");
}

export function createInitialProviderDerivedRuntimeReviewState(): ProviderDerivedRuntimeReviewState {
  return {
    sourcePreviewFingerprint: null,
    selectedSignalIds: [],
    dismissedSignalIds: [],
    reviewStatus: "idle",
  };
}

export function initializeProviderDerivedRuntimeReview(
  result: ProviderDerivedRuntimeReviewablePreviewResult,
): ProviderDerivedRuntimeReviewState {
  if (result.status === "blocked" || result.status === "error") {
    return createInitialProviderDerivedRuntimeReviewState();
  }

  const reviewableCount = result.signals.filter(isProviderDerivedSignalReviewable).length;

  return {
    sourcePreviewFingerprint: createProviderDerivedPreviewFingerprint(result),
    selectedSignalIds: [],
    dismissedSignalIds: [],
    reviewStatus: reviewableCount > 0 ? "reviewing" : "idle",
  };
}

export function syncReviewStateWithPreview(
  previous: ProviderDerivedRuntimeReviewState,
  input: {
    result: ProviderDerivedRuntimeReviewablePreviewResult | null;
    isPreviewLoading: boolean;
  },
): ProviderDerivedRuntimeReviewState {
  if (input.isPreviewLoading) {
    return createInitialProviderDerivedRuntimeReviewState();
  }

  if (!input.result || input.result.status === "blocked" || input.result.status === "error") {
    return createInitialProviderDerivedRuntimeReviewState();
  }

  const fingerprint = createProviderDerivedPreviewFingerprint(input.result);

  if (previous.sourcePreviewFingerprint === fingerprint) {
    return previous;
  }

  return initializeProviderDerivedRuntimeReview(input.result);
}

export function toggleProviderDerivedSignalSelection(
  state: ProviderDerivedRuntimeReviewState,
  signalId: string,
  signals: readonly ProviderDerivedSignal[] = [],
): ProviderDerivedRuntimeReviewState {
  const reviewableIds = new Set(
    signals.filter(isProviderDerivedSignalReviewable).map((signal) => signal.id),
  );

  if (!signalId || (!reviewableIds.has(signalId) && !state.selectedSignalIds.includes(signalId))) {
    return state;
  }

  if (state.dismissedSignalIds.includes(signalId)) {
    return state;
  }

  const isSelected = state.selectedSignalIds.includes(signalId);
  const selectedSignalIds = isSelected
    ? state.selectedSignalIds.filter((id) => id !== signalId)
    : sortUniqueIds([...state.selectedSignalIds, signalId]);

  return {
    ...state,
    selectedSignalIds,
    reviewStatus: selectedSignalIds.length > 0 ? "reviewing" : state.reviewStatus,
  };
}

export function selectAllReviewableProviderDerivedSignals(
  state: ProviderDerivedRuntimeReviewState,
  signals: readonly ProviderDerivedSignal[],
): ProviderDerivedRuntimeReviewState {
  const reviewableIds = signals
    .filter(isProviderDerivedSignalReviewable)
    .map((signal) => signal.id)
    .filter((id) => !state.dismissedSignalIds.includes(id));

  return {
    ...state,
    selectedSignalIds: sortUniqueIds(reviewableIds),
    reviewStatus: reviewableIds.length > 0 ? "reviewing" : state.reviewStatus,
  };
}

export function clearProviderDerivedSignalSelection(
  state: ProviderDerivedRuntimeReviewState,
): ProviderDerivedRuntimeReviewState {
  return {
    ...state,
    selectedSignalIds: [],
    reviewStatus: state.reviewStatus === "selection_ready" ? "reviewing" : state.reviewStatus,
  };
}

export function dismissProviderDerivedSignal(
  state: ProviderDerivedRuntimeReviewState,
  signalId: string,
  signals: readonly ProviderDerivedSignal[] = [],
): ProviderDerivedRuntimeReviewState {
  const reviewableIds = new Set(
    signals.filter(isProviderDerivedSignalReviewable).map((signal) => signal.id),
  );

  if (!signalId || !reviewableIds.has(signalId)) {
    return state;
  }

  const dismissedSignalIds = sortUniqueIds([...state.dismissedSignalIds, signalId]);
  const selectedSignalIds = state.selectedSignalIds.filter((id) => id !== signalId);

  return {
    ...state,
    dismissedSignalIds,
    selectedSignalIds,
    reviewStatus:
      selectedSignalIds.length === 0 && state.reviewStatus === "selection_ready"
        ? "reviewing"
        : state.reviewStatus,
  };
}

export function restoreDismissedProviderDerivedSignal(
  state: ProviderDerivedRuntimeReviewState,
  signalId: string,
): ProviderDerivedRuntimeReviewState {
  if (!signalId || !state.dismissedSignalIds.includes(signalId)) {
    return state;
  }

  return {
    ...state,
    dismissedSignalIds: state.dismissedSignalIds.filter((id) => id !== signalId),
  };
}

export function markProviderDerivedSelectionReady(
  state: ProviderDerivedRuntimeReviewState,
): ProviderDerivedRuntimeReviewState {
  if (state.selectedSignalIds.length === 0) {
    return state;
  }

  return {
    ...state,
    reviewStatus: "selection_ready",
  };
}

export function getReviewableSignals(
  signals: readonly ProviderDerivedSignal[],
  dismissedSignalIds: readonly string[],
): ProviderDerivedSignal[] {
  return signals.filter(
    (signal) =>
      isProviderDerivedSignalReviewable(signal) && !dismissedSignalIds.includes(signal.id),
  );
}

export function getDismissedSignals(
  signals: readonly ProviderDerivedSignal[],
  dismissedSignalIds: readonly string[],
): ProviderDerivedSignal[] {
  return signals.filter(
    (signal) =>
      isProviderDerivedSignalReviewable(signal) && dismissedSignalIds.includes(signal.id),
  );
}
