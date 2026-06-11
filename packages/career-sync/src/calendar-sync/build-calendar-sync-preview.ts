import { extractCalendarSignals } from "../calendar/extract-calendar-signals.js";
import { extractSignalsFromNangoCalendar } from "../nango/sandbox.js";
import { shouldRetainRawProviderData } from "../privacy/filters.js";
import type {
  BuildCalendarSyncPreviewOptions,
  BuildCareerBundleCalendarEnrichmentOptions,
  CalendarSyncPreview,
  CalendarSyncPreviewInput,
  CareerBundleCalendarEnrichment,
  NangoCalendarSyncPreviewInput,
} from "./types.js";
import type { CareerSyncSignal } from "../shared/types.js";
import {
  countStages,
  countUpcomingSignals,
  dedupeCompanyHints,
  summarizeCalendarSignals,
} from "./summarize-calendar-signals.js";

const DEFAULT_NOW = "1970-01-01T00:00:00.000Z";

function buildPreview(
  totalEvents: number,
  signals: CareerSyncSignal[],
  now: string,
): CalendarSyncPreview {
  return {
    source: "calendar",
    totalEvents,
    signalCount: signals.length,
    upcomingCount: countUpcomingSignals(signals, now),
    stageCounts: countStages(signals),
    companyHints: dedupeCompanyHints(signals),
    signals,
    privacy: {
      rawRetained: shouldRetainRawProviderData(),
      redacted: true,
      meetingLinksRemoved: true,
    },
  };
}

export function buildCalendarSyncPreview(
  input: CalendarSyncPreviewInput,
  options?: BuildCalendarSyncPreviewOptions,
): CalendarSyncPreview {
  const now = options?.now ?? DEFAULT_NOW;
  const signals = extractCalendarSignals(input.events);
  return buildPreview(input.events.length, signals, now);
}

export function buildNangoCalendarSyncPreview(
  input: NangoCalendarSyncPreviewInput,
  options?: BuildCalendarSyncPreviewOptions,
): CalendarSyncPreview {
  const now = options?.now ?? DEFAULT_NOW;
  const signals = extractSignalsFromNangoCalendar(input.events);
  return buildPreview(input.events.length, signals, now);
}

export function buildCareerBundleCalendarEnrichment(
  signals: CareerSyncSignal[],
  options?: BuildCareerBundleCalendarEnrichmentOptions,
): CareerBundleCalendarEnrichment {
  return {
    source: "calendar",
    signals,
    summary: summarizeCalendarSignals(signals),
    generatedAt: options?.generatedAt ?? DEFAULT_NOW,
    rawRetained: shouldRetainRawProviderData(),
  };
}
