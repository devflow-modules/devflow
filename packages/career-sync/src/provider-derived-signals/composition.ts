import type { CalendarDerivedSignal } from "../calendar-readonly-adapter/types.js";
import type { GmailDerivedSignal } from "../gmail-readonly-adapter/types.js";
import { normalizeCalendarDerivedSignal, normalizeGmailDerivedSignal } from "./normalization.js";
import type { ProviderDerivedSignal, ProviderDerivedSignalSource } from "./types.js";

const SOURCE_ORDER: Readonly<Record<ProviderDerivedSignalSource, number>> = {
  calendar: 0,
  gmail: 1,
};

function normalizeCompany(company: string | undefined): string {
  return company?.trim() ?? "";
}

function isExactDuplicate(left: ProviderDerivedSignal, right: ProviderDerivedSignal): boolean {
  return (
    left.source === right.source &&
    left.kind === right.kind &&
    left.occurredAt === right.occurredAt &&
    normalizeCompany(left.company) === normalizeCompany(right.company) &&
    left.id === right.id
  );
}

function compareProviderDerivedSignals(
  left: ProviderDerivedSignal,
  right: ProviderDerivedSignal,
): number {
  const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const sourceCompare = SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source];
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  const kindCompare = left.kind.localeCompare(right.kind);
  if (kindCompare !== 0) {
    return kindCompare;
  }

  return left.id.localeCompare(right.id);
}

function dedupeProviderDerivedSignals(signals: ProviderDerivedSignal[]): ProviderDerivedSignal[] {
  const deduped: ProviderDerivedSignal[] = [];

  for (const signal of signals) {
    const duplicate = deduped.some((existing) => isExactDuplicate(existing, signal));
    if (!duplicate) {
      deduped.push(signal);
    }
  }

  return deduped;
}

export function composeProviderDerivedSignals(input: {
  gmailSignals: GmailDerivedSignal[];
  calendarSignals: CalendarDerivedSignal[];
}): ProviderDerivedSignal[] {
  const normalized = [
    ...input.gmailSignals.map(normalizeGmailDerivedSignal),
    ...input.calendarSignals.map(normalizeCalendarDerivedSignal),
  ];

  const deduped = dedupeProviderDerivedSignals(normalized);

  return [...deduped].sort(compareProviderDerivedSignals);
}
