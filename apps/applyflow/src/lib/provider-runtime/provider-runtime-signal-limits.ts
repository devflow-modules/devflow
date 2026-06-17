import {
  composeProviderDerivedSignals,
  type CalendarDerivedSignal,
  type GmailDerivedSignal,
  type ProviderDerivedSignal,
} from "@devflow/career-sync";

export const PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW = 25;

export const PROVIDER_SIGNALS_TRUNCATED_WARNING = "provider_signals_truncated" as const;

function compareSignalsForLimit(left: ProviderDerivedSignal, right: ProviderDerivedSignal): number {
  const timeCompare = right.occurredAt.localeCompare(left.occurredAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const sourceCompare = left.source.localeCompare(right.source);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  const kindCompare = left.kind.localeCompare(right.kind);
  if (kindCompare !== 0) {
    return kindCompare;
  }

  return left.id.localeCompare(right.id);
}

export function composeAndLimitProviderRuntimeSignals(input: {
  gmailSignals: GmailDerivedSignal[];
  calendarSignals: CalendarDerivedSignal[];
  maxSignals?: number;
}): { signals: ProviderDerivedSignal[]; truncated: boolean } {
  const composed = composeProviderDerivedSignals({
    gmailSignals: input.gmailSignals,
    calendarSignals: input.calendarSignals,
  });

  const maxSignals = input.maxSignals ?? PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW;

  if (composed.length <= maxSignals) {
    return { signals: composed, truncated: false };
  }

  const limited = [...composed].sort(compareSignalsForLimit).slice(0, maxSignals);

  return {
    signals: [...limited].sort((left, right) => {
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
    }),
    truncated: true,
  };
}
