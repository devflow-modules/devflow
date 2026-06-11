import { buildSignalId, normalizeText } from "../shared/normalize.js";
import type { CareerSyncSignal, RawCalendarEventLike } from "../shared/types.js";
import { requiresAction, shouldRetainRawProviderData } from "../privacy/filters.js";
import { redactSensitiveText } from "../privacy/redact.js";
import {
  calendarEventCorpus,
  inferCalendarProcessStage,
  isCareerRelatedCalendarEvent,
} from "./normalize-calendar-signal.js";

export function normalizeCalendarEvent(event: RawCalendarEventLike): CareerSyncSignal | null {
  if (!isCareerRelatedCalendarEvent(event)) {
    return null;
  }

  const corpus = calendarEventCorpus(event);
  const { stage, confidence } = inferCalendarProcessStage(corpus);
  const actionRequired = requiresAction(corpus);

  const summary = normalizeText(event.summary) || "Career-related calendar event";
  const safeSummary = redactSensitiveText(summary);

  return {
    id: buildSignalId("calendar", event.id),
    source: "calendar",
    providerId: event.id,
    processStage: stage,
    actionRequired,
    eventAt: event.start,
    confidence: actionRequired && confidence !== "high" ? "medium" : confidence,
    safeSummary,
    rawRetained: shouldRetainRawProviderData(),
  };
}

export function extractCalendarSignals(events: RawCalendarEventLike[]): CareerSyncSignal[] {
  const out: CareerSyncSignal[] = [];
  for (const event of events) {
    const signal = normalizeCalendarEvent(event);
    if (signal) out.push(signal);
  }
  return out;
}
