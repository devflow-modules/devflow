import {
  createProviderDerivedSignalId,
  type CalendarDerivedSignal,
  type CalendarEphemeralEventMetadata,
} from "@devflow/career-sync";
import { runtimeSignalConfidence } from "./provider-runtime-signal-confidence";

export const CALENDAR_ACTIVITY_REASON_PREFIX =
  "Rule B: factual Calendar activity from sanitized metadata (startsAt, endsAt, status, duration bucket, future/past). Title, description, location, meeting links, and attendee addresses were not analyzed.";

export const CORRELATION_WINDOW_MS = 72 * 60 * 60 * 1000;

export const FOLLOW_UP_MIN_ELAPSED_MS = 24 * 60 * 60 * 1000;
export const FOLLOW_UP_MAX_ELAPSED_MS = 14 * 24 * 60 * 60 * 1000;

export type CalendarDurationBucket = "short" | "medium" | "long";

const SHORT_DURATION_MS = 30 * 60 * 1000;
const MEDIUM_DURATION_MS = 2 * 60 * 60 * 1000;

export function resolveCalendarDurationBucket(
  startsAt: string,
  endsAt: string,
): CalendarDurationBucket | undefined {
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return undefined;
  }

  const durationMs = endMs - startMs;

  if (durationMs < SHORT_DURATION_MS) {
    return "short";
  }

  if (durationMs <= MEDIUM_DURATION_MS) {
    return "medium";
  }

  return "long";
}

function isValidEventMetadata(item: CalendarEphemeralEventMetadata): boolean {
  if (
    !item.startsAt ||
    !item.endsAt ||
    !Number.isFinite(Date.parse(item.startsAt)) ||
    !Number.isFinite(Date.parse(item.endsAt))
  ) {
    return false;
  }

  return Date.parse(item.endsAt) > Date.parse(item.startsAt);
}

function compareEventMetadata(
  left: CalendarEphemeralEventMetadata,
  right: CalendarEphemeralEventMetadata,
): number {
  const timeCompare = left.startsAt.localeCompare(right.startsAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const leftDomain = left.organizerDomain ?? "";
  const rightDomain = right.organizerDomain ?? "";
  return leftDomain.localeCompare(rightDomain);
}

function resolveTemporalState(
  startsAt: string,
  referenceMs: number,
): "future" | "past" {
  return Date.parse(startsAt) > referenceMs ? "future" : "past";
}

function buildCalendarActivityReason(
  item: CalendarEphemeralEventMetadata,
  referenceMs: number,
): string {
  const durationBucket = resolveCalendarDurationBucket(item.startsAt, item.endsAt);
  const temporalState = resolveTemporalState(item.startsAt, referenceMs);
  const durationSuffix = durationBucket ? ` Duration bucket: ${durationBucket}.` : "";
  return `${CALENDAR_ACTIVITY_REASON_PREFIX} Temporal state: ${temporalState}.${durationSuffix}`;
}

export function deriveCalendarRuntimeSignalsFromMetadata(
  metadata: CalendarEphemeralEventMetadata[],
  options?: { referenceMs?: number },
): CalendarDerivedSignal[] {
  const referenceMs = options?.referenceMs ?? Date.now();
  const sorted = [...metadata].filter(isValidEventMetadata).sort(compareEventMetadata);
  const signals: CalendarDerivedSignal[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const id = createProviderDerivedSignalId({
      source: "calendar",
      kind: "provider_calendar_activity",
      occurredAt: item.startsAt,
      sequence: index + 1,
    });

    if (!id) {
      continue;
    }

    signals.push({
      id,
      kind: "provider_calendar_activity",
      provider: "calendar",
      occurredAt: item.startsAt,
      startsAt: item.startsAt,
      company: item.organizerDomain,
      confidence: runtimeSignalConfidence("high"),
      confidenceLevel: "high",
      reason: buildCalendarActivityReason(item, referenceMs),
      reviewRequired: true,
      sourceCount: 1,
    });
  }

  return signals;
}
