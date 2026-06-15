import type {
  ProviderDerivedSignal,
  ProviderDerivedSignalKind,
  ProviderDerivedSignalSummary,
} from "./types.js";

const INTERVIEW_KINDS = new Set<ProviderDerivedSignalKind>([
  "interview_likely",
  "interview_scheduled",
  "interview_rescheduled",
  "interview_cancelled",
  "recruiter_call_likely",
]);

const PENDING_ACTION_KINDS = new Set<ProviderDerivedSignalKind>([
  "follow_up_required",
  "follow_up_event_due",
  "application_deadline_detected",
]);

export function createEmptyProviderDerivedSignalSummary(): ProviderDerivedSignalSummary {
  return {
    totalSignals: 0,
    gmailSignalCount: 0,
    calendarSignalCount: 0,
    reviewRequiredCount: 0,
    companies: [],
    kinds: [],
    hasInterviewSignal: false,
    hasPendingActionSignal: false,
    hasOfferSignal: false,
    hasRejectionSignal: false,
  };
}

export function summarizeProviderDerivedSignals(
  signals: ProviderDerivedSignal[],
): ProviderDerivedSignalSummary {
  if (signals.length === 0) {
    return createEmptyProviderDerivedSignalSummary();
  }

  const companies = [
    ...new Set(
      signals
        .map((signal) => signal.company?.trim())
        .filter((company): company is string => company != null && company.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const kinds = [...new Set(signals.map((signal) => signal.kind))].sort((left, right) =>
    left.localeCompare(right),
  );

  let latestActivityAt: string | undefined;
  for (const signal of signals) {
    if (latestActivityAt == null || signal.occurredAt.localeCompare(latestActivityAt) > 0) {
      latestActivityAt = signal.occurredAt;
    }
  }

  const gmailSignalCount = signals.filter((signal) => signal.source === "gmail").length;
  const calendarSignalCount = signals.filter((signal) => signal.source === "calendar").length;

  return {
    totalSignals: signals.length,
    gmailSignalCount,
    calendarSignalCount,
    reviewRequiredCount: signals.filter((signal) => signal.reviewRequired).length,
    companies,
    kinds,
    hasInterviewSignal: signals.some((signal) => INTERVIEW_KINDS.has(signal.kind)),
    hasPendingActionSignal: signals.some((signal) => PENDING_ACTION_KINDS.has(signal.kind)),
    hasOfferSignal: signals.some((signal) => signal.kind === "offer_likely"),
    hasRejectionSignal: signals.some((signal) => signal.kind === "rejection_likely"),
    latestActivityAt,
  };
}
