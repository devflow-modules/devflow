import {
  createProviderDerivedSignalId,
  type CalendarEphemeralEventMetadata,
  type GmailDerivedSignal,
  type GmailEphemeralMessageMetadata,
} from "@devflow/career-sync";
import {
  CORRELATION_WINDOW_MS,
  FOLLOW_UP_MAX_ELAPSED_MS,
  FOLLOW_UP_MIN_ELAPSED_MS,
} from "./calendar-runtime-classifier";
import { runtimeSignalConfidence } from "./provider-runtime-signal-confidence";

const CLUSTER_REASON =
  "Rule C: related provider activity may require review. Deterministic temporal correlation between sanitized Gmail metadata and a future Calendar event within a 72-hour inclusive window. Message subject, event title, and hiring semantics were not analyzed.";

const FOLLOW_UP_REASON_PREFIX =
  "Rule D: follow-up review window. Known email direction with no correlated Calendar event within the documented window. Subject, snippet, and body were not analyzed.";

function isValidEmail(item: GmailEphemeralMessageMetadata): boolean {
  return Boolean(item.occurredAt) && Number.isFinite(Date.parse(item.occurredAt));
}

function isValidEvent(item: CalendarEphemeralEventMetadata): boolean {
  return (
    Boolean(item.startsAt) &&
    Boolean(item.endsAt) &&
    Number.isFinite(Date.parse(item.startsAt)) &&
    Number.isFinite(Date.parse(item.endsAt)) &&
    Date.parse(item.endsAt) > Date.parse(item.startsAt)
  );
}

function isFutureEvent(startsAt: string, referenceMs: number): boolean {
  return Date.parse(startsAt) > referenceMs;
}

function isEmailWithinCorrelationWindow(
  emailOccurredAt: string,
  eventStartsAt: string,
): boolean {
  const emailMs = Date.parse(emailOccurredAt);
  const eventMs = Date.parse(eventStartsAt);
  const delta = eventMs - emailMs;

  return delta >= 0 && delta <= CORRELATION_WINDOW_MS;
}

function clusterDedupeKey(email: GmailEphemeralMessageMetadata, event: CalendarEphemeralEventMetadata): string {
  const domain = email.senderDomain ?? "unknown";
  const eventBucket = event.startsAt.slice(0, 13);
  const emailBucket = email.occurredAt.slice(0, 13);
  return `${domain}|${eventBucket}|${emailBucket}`;
}

function compareClusterSignals(left: GmailDerivedSignal, right: GmailDerivedSignal): number {
  const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const leftStarts = left.startsAt ?? "";
  const rightStarts = right.startsAt ?? "";
  return leftStarts.localeCompare(rightStarts);
}

export function deriveProviderActivityClusterSignals(input: {
  gmailMetadata: GmailEphemeralMessageMetadata[];
  calendarMetadata: CalendarEphemeralEventMetadata[];
  referenceMs?: number;
}): GmailDerivedSignal[] {
  const referenceMs = input.referenceMs ?? Date.now();
  const emails = input.gmailMetadata.filter(isValidEmail);
  const events = input.calendarMetadata.filter(
    (event) => isValidEvent(event) && isFutureEvent(event.startsAt, referenceMs),
  );

  const dedupeKeys = new Set<string>();
  const clusters: GmailDerivedSignal[] = [];

  for (const email of emails) {
    for (const event of events) {
      if (!isEmailWithinCorrelationWindow(email.occurredAt, event.startsAt)) {
        continue;
      }

      const key = clusterDedupeKey(email, event);
      if (dedupeKeys.has(key)) {
        continue;
      }

      dedupeKeys.add(key);

      const id = createProviderDerivedSignalId({
        source: "gmail",
        kind: "provider_activity_cluster",
        occurredAt: email.occurredAt,
        sequence: clusters.length + 1,
      });

      if (!id) {
        continue;
      }

      clusters.push({
        id,
        kind: "provider_activity_cluster",
        provider: "gmail",
        occurredAt: email.occurredAt,
        startsAt: event.startsAt,
        company: email.senderDomain ?? event.organizerDomain,
        confidence: runtimeSignalConfidence("medium"),
        confidenceLevel: "medium",
        reason: CLUSTER_REASON,
        reviewRequired: true,
        sourceCount: 2,
      });
    }
  }

  return clusters.sort(compareClusterSignals);
}

function emailHasCluster(
  email: GmailEphemeralMessageMetadata,
  clusters: GmailDerivedSignal[],
): boolean {
  return clusters.some(
    (cluster) =>
      cluster.kind === "provider_activity_cluster" && cluster.occurredAt === email.occurredAt,
  );
}

function isKnownDirection(
  direction: GmailEphemeralMessageMetadata["direction"],
): direction is "inbound" | "outbound" {
  return direction === "inbound" || direction === "outbound";
}

export function deriveProviderFollowUpWindowSignals(input: {
  gmailMetadata: GmailEphemeralMessageMetadata[];
  clusterSignals: GmailDerivedSignal[];
  referenceMs?: number;
}): GmailDerivedSignal[] {
  const referenceMs = input.referenceMs ?? Date.now();
  const signals: GmailDerivedSignal[] = [];

  for (let index = 0; index < input.gmailMetadata.length; index += 1) {
    const email = input.gmailMetadata[index];

    if (!isValidEmail(email) || !isKnownDirection(email.direction)) {
      continue;
    }

    if (emailHasCluster(email, input.clusterSignals)) {
      continue;
    }

    const elapsedMs = referenceMs - Date.parse(email.occurredAt);
    if (elapsedMs < FOLLOW_UP_MIN_ELAPSED_MS || elapsedMs > FOLLOW_UP_MAX_ELAPSED_MS) {
      continue;
    }

    const id = createProviderDerivedSignalId({
      source: "gmail",
      kind: "provider_follow_up_window",
      occurredAt: email.occurredAt,
      sequence: signals.length + 1,
    });

    if (!id) {
      continue;
    }

    signals.push({
      id,
      kind: "provider_follow_up_window",
      provider: "gmail",
      occurredAt: email.occurredAt,
      company: email.senderDomain,
      confidence: runtimeSignalConfidence("low"),
      confidenceLevel: "low",
      reason: `${FOLLOW_UP_REASON_PREFIX} Direction: ${email.direction}.`,
      reviewRequired: true,
      sourceCount: 1,
    });
  }

  return signals;
}
