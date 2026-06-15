import type { CalendarDerivedSignal, CalendarEphemeralEventMetadata } from "@devflow/career-sync";

/**
 * Conservative runtime classifier for real Calendar metadata.
 * Unlike the sandbox classifier, this does not use sandbox scenario markers or infer
 * interview/deadline signals from conference flags or attendee counts alone.
 */
export function deriveCalendarRuntimeSignalsFromMetadata(
  _metadata: CalendarEphemeralEventMetadata[],
): CalendarDerivedSignal[] {
  return [];
}
