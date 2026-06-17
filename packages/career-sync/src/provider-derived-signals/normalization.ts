import type { CalendarDerivedSignal } from "../calendar-readonly-adapter/types.js";
import type { GmailDerivedSignal } from "../gmail-readonly-adapter/types.js";
import type { ProviderDerivedSignal } from "./types.js";

export function normalizeGmailDerivedSignal(signal: GmailDerivedSignal): ProviderDerivedSignal {
  return {
    id: signal.id,
    source: "gmail",
    kind: signal.kind,
    occurredAt: signal.occurredAt,
    startsAt: signal.startsAt,
    company: signal.company,
    confidence: signal.confidence,
    confidenceLevel: signal.confidenceLevel,
    reason: signal.reason,
    reviewRequired: true,
    sourceCount: signal.sourceCount,
  };
}

export function normalizeCalendarDerivedSignal(
  signal: CalendarDerivedSignal,
): ProviderDerivedSignal {
  return {
    id: signal.id,
    source: "calendar",
    kind: signal.kind,
    occurredAt: signal.occurredAt,
    startsAt: signal.startsAt,
    company: signal.company,
    confidence: signal.confidence,
    confidenceLevel: signal.confidenceLevel,
    reason: signal.reason,
    reviewRequired: true,
    sourceCount: signal.sourceCount,
  };
}
