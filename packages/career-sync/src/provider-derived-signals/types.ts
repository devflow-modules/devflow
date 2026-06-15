/**
 * Provider-agnostic derived signal composition — pure types only.
 * Does not call Gmail/Calendar APIs, Nango, or retain raw provider payloads.
 */

export type ProviderDerivedSignalSource = "gmail" | "calendar";

export type ProviderDerivedSignalKind =
  | "application_detected"
  | "interview_likely"
  | "follow_up_required"
  | "recruiter_response_detected"
  | "rejection_likely"
  | "offer_likely"
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "recruiter_call_likely"
  | "follow_up_event_due"
  | "application_deadline_detected";

export type ProviderDerivedSignal = {
  id: string;
  source: ProviderDerivedSignalSource;
  kind: ProviderDerivedSignalKind;
  occurredAt: string;
  startsAt?: string;
  company?: string;
  confidence: number;
  reviewRequired: true;
  sourceCount: number;
};

export type ProviderDerivedSignalSummary = {
  totalSignals: number;
  gmailSignalCount: number;
  calendarSignalCount: number;
  reviewRequiredCount: number;
  companies: string[];
  kinds: ProviderDerivedSignalKind[];
  hasInterviewSignal: boolean;
  hasPendingActionSignal: boolean;
  hasOfferSignal: boolean;
  hasRejectionSignal: boolean;
  latestActivityAt?: string;
};

export type ProviderDerivedSandboxCompositionResult = {
  runtime: "sandbox";
  status: "completed" | "error";
  safeForClient: true;
  deterministic: true;
  importedRawProviderData: false;
  retainedRawPayload: false;
  retainedBodies: false;
  retainedSnippets: false;
  retainedDescriptions: false;
  retainedLocations: false;
  retainedMeetingLinks: false;
  retainedProviderIdentifiers: false;
  hasToken: false;
  userReviewRequired: true;
  signals: ProviderDerivedSignal[];
  summary: ProviderDerivedSignalSummary;
  warnings: string[];
  messages: string[];
};
