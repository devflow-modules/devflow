import type {
  ProviderDerivedSignal,
  ProviderDerivedSignalConfidenceLevel,
  ProviderDerivedSignalSummary,
} from "@devflow/career-sync";

export type ProviderInsightsTimelineFilter =
  | "all"
  | "gmail"
  | "calendar"
  | "correlation"
  | "high"
  | "medium"
  | "low";

export type ProviderInsightsTimelineViewState =
  | "no_preview"
  | "blocked"
  | "zero_signals"
  | "signals_available"
  | "filter_empty";

export type ProviderInsightsTimelineDayGroup = {
  dayKey: string;
  label: string;
  signals: ProviderDerivedSignal[];
};

export const PROVIDER_INSIGHTS_TIMELINE_FILTERS: ProviderInsightsTimelineFilter[] = [
  "all",
  "gmail",
  "calendar",
  "correlation",
  "high",
  "medium",
  "low",
];

export function getProviderSignalConfidenceLevel(
  signal: ProviderDerivedSignal,
): ProviderDerivedSignalConfidenceLevel {
  if (signal.confidenceLevel) {
    return signal.confidenceLevel;
  }

  if (signal.confidence >= 0.75) {
    return "high";
  }

  if (signal.confidence >= 0.5) {
    return "medium";
  }

  return "low";
}

export function isProviderCorrelationSignal(signal: ProviderDerivedSignal): boolean {
  return signal.kind === "provider_activity_cluster";
}

export function compareProviderInsightsTimelineSignals(
  left: ProviderDerivedSignal,
  right: ProviderDerivedSignal,
): number {
  const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const sourceOrder = left.source === "calendar" ? 0 : 1;
  const rightSourceOrder = right.source === "calendar" ? 0 : 1;
  const sourceCompare = sourceOrder - rightSourceOrder;
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  const kindCompare = left.kind.localeCompare(right.kind);
  if (kindCompare !== 0) {
    return kindCompare;
  }

  return left.id.localeCompare(right.id);
}

export function filterProviderInsightsSignals(
  signals: ProviderDerivedSignal[],
  filter: ProviderInsightsTimelineFilter,
): ProviderDerivedSignal[] {
  const sorted = [...signals].sort(compareProviderInsightsTimelineSignals);

  switch (filter) {
    case "all":
      return sorted;
    case "gmail":
      return sorted.filter((signal) => signal.source === "gmail");
    case "calendar":
      return sorted.filter((signal) => signal.source === "calendar");
    case "correlation":
      return sorted.filter((signal) => isProviderCorrelationSignal(signal));
    case "high":
    case "medium":
    case "low":
      return sorted.filter((signal) => getProviderSignalConfidenceLevel(signal) === filter);
  }
}

function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-");
  return `${year}-${month}-${day}`;
}

function dayKeyFromOccurredAt(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

export function groupProviderInsightsSignalsByDay(
  signals: ProviderDerivedSignal[],
): ProviderInsightsTimelineDayGroup[] {
  const sorted = [...signals].sort(compareProviderInsightsTimelineSignals);
  const groups = new Map<string, ProviderDerivedSignal[]>();

  for (const signal of sorted) {
    const dayKey = dayKeyFromOccurredAt(signal.occurredAt);
    const existing = groups.get(dayKey) ?? [];
    existing.push(signal);
    groups.set(dayKey, existing);
  }

  return [...groups.entries()]
    .sort(([leftDay], [rightDay]) => rightDay.localeCompare(leftDay))
    .map(([dayKey, daySignals]) => ({
      dayKey,
      label: formatDayLabel(dayKey),
      signals: [...daySignals].sort(compareProviderInsightsTimelineSignals),
    }));
}

export function resolveProviderInsightsTimelineViewState(input: {
  previewUiState: string;
  previewStatus?: string;
  totalSignals: number;
  filteredCount: number;
}): ProviderInsightsTimelineViewState {
  if (input.previewUiState === "idle" || input.previewUiState === "loading") {
    return "no_preview";
  }

  if (input.previewUiState === "blocked" || input.previewStatus === "blocked") {
    return "blocked";
  }

  if (input.totalSignals === 0) {
    return "zero_signals";
  }

  if (input.filteredCount === 0) {
    return "filter_empty";
  }

  return "signals_available";
}

export type ProviderInsightsTimelineSummaryView = {
  total: number;
  gmail: number;
  calendar: number;
  correlation: number;
  lowConfidence: number;
  reviewRequired: number;
};

export function buildProviderInsightsTimelineSummaryView(
  summary: ProviderDerivedSignalSummary,
): ProviderInsightsTimelineSummaryView {
  return {
    total: summary.totalSignals,
    gmail: summary.gmailSignalCount,
    calendar: summary.calendarSignalCount,
    correlation: summary.correlationSignalCount,
    lowConfidence: summary.lowConfidenceSignalCount,
    reviewRequired: summary.reviewRequiredCount,
  };
}
