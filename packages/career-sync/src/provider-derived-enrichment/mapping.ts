import type { ProviderDerivedSignal, ProviderDerivedSignalKind } from "../provider-derived-signals/types.js";
import type { CareerSyncSignal, ProcessStage, SyncConfidence } from "../shared/types.js";

const PENDING_ACTION_KINDS = new Set<ProviderDerivedSignalKind>([
  "follow_up_required",
  "follow_up_event_due",
  "application_deadline_detected",
]);

const UPCOMING_EVENT_KINDS = new Set<ProviderDerivedSignalKind>([
  "interview_scheduled",
  "interview_rescheduled",
  "recruiter_call_likely",
  "follow_up_event_due",
  "application_deadline_detected",
]);

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function confidenceToSyncConfidence(confidence: number): SyncConfidence {
  if (confidence >= 0.85) {
    return "high";
  }
  if (confidence >= 0.75) {
    return "medium";
  }
  return "low";
}

function kindToProcessStage(kind: ProviderDerivedSignalKind): ProcessStage {
  switch (kind) {
    case "application_detected":
    case "application_deadline_detected":
      return "applied";
    case "interview_likely":
    case "interview_scheduled":
    case "interview_rescheduled":
    case "interview_cancelled":
    case "recruiter_call_likely":
      return "interview";
    case "follow_up_required":
    case "follow_up_event_due":
    case "recruiter_response_detected":
      return "screening";
    case "rejection_likely":
      return "rejected";
    case "offer_likely":
      return "offer";
    default:
      return "unknown";
  }
}

function formatKindLabel(kind: ProviderDerivedSignalKind): string {
  return kind.replace(/_/g, " ");
}

function buildSafeSummary(signal: ProviderDerivedSignal): string {
  const companySuffix = signal.company ? ` (${signal.company})` : "";
  return `Review required: ${formatKindLabel(signal.kind)} signal${companySuffix}`;
}

function shouldIncludeEventAt(signal: ProviderDerivedSignal): boolean {
  return (
    signal.source === "calendar" &&
    signal.startsAt != null &&
    isValidIsoDate(signal.startsAt) &&
    UPCOMING_EVENT_KINDS.has(signal.kind)
  );
}

export function mapProviderDerivedSignalToCareerSyncSignal(
  signal: ProviderDerivedSignal,
): CareerSyncSignal {
  const syncSignal: CareerSyncSignal = {
    id: signal.id,
    source: signal.source,
    companyHint: signal.company,
    processStage: kindToProcessStage(signal.kind),
    actionRequired: PENDING_ACTION_KINDS.has(signal.kind),
    confidence: confidenceToSyncConfidence(signal.confidence),
    safeSummary: buildSafeSummary(signal),
    rawRetained: false,
  };

  if (signal.source === "gmail") {
    syncSignal.receivedAt = signal.occurredAt;
  }

  if (shouldIncludeEventAt(signal)) {
    syncSignal.eventAt = signal.startsAt;
  }

  return syncSignal;
}

export function mapProviderDerivedSignalsToCareerSyncSignals(
  signals: ProviderDerivedSignal[],
): CareerSyncSignal[] {
  return signals.map(mapProviderDerivedSignalToCareerSyncSignal);
}

export {
  PENDING_ACTION_KINDS,
  UPCOMING_EVENT_KINDS,
};
