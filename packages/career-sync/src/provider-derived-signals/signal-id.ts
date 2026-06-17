import type { ProviderDerivedSignalKind, ProviderDerivedSignalSource } from "./types.js";

export const PROVIDER_DERIVED_SIGNAL_ID_PREFIX = "provider-signal" as const;

export type CreateProviderDerivedSignalIdInput = {
  source: ProviderDerivedSignalSource;
  kind: ProviderDerivedSignalKind;
  occurredAt: string;
  sequence: number;
};

const VALID_SOURCES = new Set<ProviderDerivedSignalSource>(["gmail", "calendar"]);

const VALID_KINDS = new Set<ProviderDerivedSignalKind>([
  "application_detected",
  "interview_likely",
  "follow_up_required",
  "recruiter_response_detected",
  "rejection_likely",
  "offer_likely",
  "interview_scheduled",
  "interview_rescheduled",
  "interview_cancelled",
  "recruiter_call_likely",
  "follow_up_event_due",
  "application_deadline_detected",
  "provider_email_activity",
  "provider_calendar_activity",
  "provider_activity_cluster",
  "provider_follow_up_window",
]);

const FORBIDDEN_ID_FRAGMENTS = [
  "sandbox",
  "runtime",
  "nango",
  "google",
  "messageid",
  "threadid",
  "eventid",
  "calendarid",
  "@",
] as const;

const PROVIDER_DERIVED_SIGNAL_ID_PATTERN =
  /^provider-signal-(gmail|calendar)-([a-z_]+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-(\d{3,})$/;

export function normalizeTimestampForProviderDerivedSignalId(
  occurredAt: string,
): string | undefined {
  const parsed = Date.parse(occurredAt);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString().replace(/[:.]/g, "-");
}

function formatProviderDerivedSignalSequence(sequence: number): string | undefined {
  if (!Number.isInteger(sequence) || sequence < 1) {
    return undefined;
  }

  return String(sequence).padStart(3, "0");
}

function containsForbiddenIdFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_ID_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export function createProviderDerivedSignalId(
  input: CreateProviderDerivedSignalIdInput,
): string | undefined {
  if (!VALID_SOURCES.has(input.source)) {
    return undefined;
  }

  if (!VALID_KINDS.has(input.kind)) {
    return undefined;
  }

  const normalizedTimestamp = normalizeTimestampForProviderDerivedSignalId(input.occurredAt);
  if (!normalizedTimestamp) {
    return undefined;
  }

  const formattedSequence = formatProviderDerivedSignalSequence(input.sequence);
  if (!formattedSequence) {
    return undefined;
  }

  const id = `${PROVIDER_DERIVED_SIGNAL_ID_PREFIX}-${input.source}-${input.kind}-${normalizedTimestamp}-${formattedSequence}`;

  if (containsForbiddenIdFragment(id)) {
    return undefined;
  }

  return id;
}

export function isProviderDerivedSignalId(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return false;
  }

  if (containsForbiddenIdFragment(value)) {
    return false;
  }

  const match = PROVIDER_DERIVED_SIGNAL_ID_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const source = match[1] as ProviderDerivedSignalSource;
  const kind = match[2] as ProviderDerivedSignalKind;
  const sequence = Number(match[4]);

  if (!VALID_SOURCES.has(source) || !VALID_KINDS.has(kind)) {
    return false;
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    return false;
  }

  return true;
}
