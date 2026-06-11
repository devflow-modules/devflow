import { extractCalendarSignals } from "../calendar/extract-calendar-signals.js";
import { extractGmailSignals } from "../gmail/extract-gmail-signals.js";
import type { CareerSyncSignal } from "../shared/types.js";
import { mapNangoCalendarEvent } from "./map-nango-calendar.js";
import { mapNangoGmailMessage } from "./map-nango-gmail.js";
import type { NangoCalendarEventLike, NangoGmailMessageLike } from "./types.js";

export function extractSignalsFromNangoGmail(messages: NangoGmailMessageLike[]): CareerSyncSignal[] {
  return extractGmailSignals(messages.map(mapNangoGmailMessage));
}

export function extractSignalsFromNangoCalendar(events: NangoCalendarEventLike[]): CareerSyncSignal[] {
  return extractCalendarSignals(events.map(mapNangoCalendarEvent));
}
