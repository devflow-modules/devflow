import type { CareerSyncSignal } from "../shared/types.js";
import type { NangoCalendarEventLike } from "../nango/types.js";
import type { RawCalendarEventLike } from "../shared/types.js";

export type CalendarSyncPreviewInput = {
  events: RawCalendarEventLike[];
};

export type NangoCalendarSyncPreviewInput = {
  events: NangoCalendarEventLike[];
};

export type BuildCalendarSyncPreviewOptions = {
  now?: string;
};

export type CalendarSyncPreview = {
  source: "calendar";
  totalEvents: number;
  signalCount: number;
  upcomingCount: number;
  stageCounts: Record<string, number>;
  companyHints: string[];
  signals: CareerSyncSignal[];
  privacy: {
    rawRetained: false;
    redacted: true;
    meetingLinksRemoved: true;
  };
};

export type BuildCareerBundleCalendarEnrichmentOptions = {
  generatedAt?: string;
};

export type CareerBundleCalendarEnrichment = {
  source: "calendar";
  signals: CareerSyncSignal[];
  summary: string;
  generatedAt: string;
  rawRetained: false;
};
