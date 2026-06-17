// Server-only provider-derived runtime composition.
// Do not import this file from client components.

import {
  createEmptyProviderDerivedSignalSummary,
  isCalendarReadOnlyAdapterResultSafe,
  isGmailReadOnlyAdapterResultSafe,
  summarizeProviderDerivedSignals,
  type CalendarEphemeralEventMetadata,
  type CalendarReadOnlyAdapterResult,
  type GmailEphemeralMessageMetadata,
  type GmailReadOnlyAdapterResult,
  type ProviderDerivedSignal,
  type ProviderDerivedSignalSummary,
} from "@devflow/career-sync";
import {
  deriveProviderActivityClusterSignals,
  deriveProviderFollowUpWindowSignals,
} from "./provider-runtime-correlation-classifier";
import {
  composeAndLimitProviderRuntimeSignals,
  PROVIDER_SIGNALS_TRUNCATED_WARNING,
} from "./provider-runtime-signal-limits";

export type ProviderDerivedRuntimeCompositionStatus =
  | "blocked"
  | "completed"
  | "partial"
  | "error";

export type ProviderDerivedRuntimeCompositionResult = {
  runtime: "nango";
  status: ProviderDerivedRuntimeCompositionStatus;
  safeForClient: true;
  readOnly: true;
  userReviewRequired: true;
  gmailStatus: "blocked" | "completed" | "error";
  calendarStatus: "blocked" | "completed" | "error";
  processedMessageCount: number;
  processedEventCount: number;
  importedRawProviderData: false;
  retainedRawPayload: false;
  retainedBodies: false;
  retainedSnippets: false;
  retainedDescriptions: false;
  retainedLocations: false;
  retainedMeetingLinks: false;
  retainedProviderIdentifiers: false;
  retainedAttendeeAddresses: false;
  hasToken: false;
  signals: ProviderDerivedSignal[];
  summary: ProviderDerivedSignalSummary;
  warnings: string[];
  messages: string[];
};

export type ProviderRuntimeGmailExecution = {
  result: GmailReadOnlyAdapterResult;
  metadata?: GmailEphemeralMessageMetadata[];
};

export type ProviderRuntimeCalendarExecution = {
  result: CalendarReadOnlyAdapterResult;
  metadata?: CalendarEphemeralEventMetadata[];
};

export type ProviderDerivedRuntimeCompositionDependencies = {
  executeGmail: () => Promise<ProviderRuntimeGmailExecution | GmailReadOnlyAdapterResult>;
  executeCalendar: () => Promise<ProviderRuntimeCalendarExecution | CalendarReadOnlyAdapterResult>;
  referenceMs?: number;
};

const COMPLETED_MESSAGE =
  "Gmail and Calendar metadata were processed through read-only runtime boundaries. No raw provider data was retained.";

const PARTIAL_MESSAGE =
  "Provider metadata was partially processed through read-only runtime boundaries. Available derived signals require user review.";

const BLOCKED_MESSAGE =
  "Provider-derived runtime composition was blocked by runtime safety gates.";

const ERROR_MESSAGE = "Provider-derived runtime composition failed safely.";

type GmailRuntimeWarning = "gmail_blocked" | "gmail_runtime_error" | "gmail_unsafe_result";
type CalendarRuntimeWarning =
  | "calendar_blocked"
  | "calendar_runtime_error"
  | "calendar_unsafe_result";

type GmailRuntimeOutcome =
  | {
      kind: "completed";
      signals: GmailReadOnlyAdapterResult["signals"];
      processedMessageCount: number;
      metadata: GmailEphemeralMessageMetadata[];
    }
  | { kind: "blocked" }
  | { kind: "failed"; warning: GmailRuntimeWarning };

type CalendarRuntimeOutcome =
  | {
      kind: "completed";
      signals: CalendarReadOnlyAdapterResult["signals"];
      processedEventCount: number;
      metadata: CalendarEphemeralEventMetadata[];
    }
  | { kind: "blocked" }
  | { kind: "failed"; warning: CalendarRuntimeWarning };

function createRuntimeCompositionSafetyFlags(): Pick<
  ProviderDerivedRuntimeCompositionResult,
  | "runtime"
  | "safeForClient"
  | "readOnly"
  | "userReviewRequired"
  | "importedRawProviderData"
  | "retainedRawPayload"
  | "retainedBodies"
  | "retainedSnippets"
  | "retainedDescriptions"
  | "retainedLocations"
  | "retainedMeetingLinks"
  | "retainedProviderIdentifiers"
  | "retainedAttendeeAddresses"
  | "hasToken"
> {
  return {
    runtime: "nango",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedProviderIdentifiers: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
  };
}

export function isSafeGmailRuntimeResult(result: GmailReadOnlyAdapterResult): boolean {
  return isGmailReadOnlyAdapterResultSafe(result);
}

export function isSafeCalendarRuntimeResult(result: CalendarReadOnlyAdapterResult): boolean {
  return isCalendarReadOnlyAdapterResultSafe(result);
}

function unwrapGmailExecution(
  value: ProviderRuntimeGmailExecution | GmailReadOnlyAdapterResult,
): ProviderRuntimeGmailExecution {
  if ("result" in value) {
    return value;
  }

  return { result: value, metadata: [] };
}

function unwrapCalendarExecution(
  value: ProviderRuntimeCalendarExecution | CalendarReadOnlyAdapterResult,
): ProviderRuntimeCalendarExecution {
  if ("result" in value) {
    return value;
  }

  return { result: value, metadata: [] };
}

function resolveGmailRuntimeOutcome(
  settled: PromiseSettledResult<ProviderRuntimeGmailExecution | GmailReadOnlyAdapterResult>,
): GmailRuntimeOutcome {
  if (settled.status === "rejected") {
    return { kind: "failed", warning: "gmail_runtime_error" };
  }

  const execution = unwrapGmailExecution(settled.value);
  const result = execution.result;

  if (!isSafeGmailRuntimeResult(result)) {
    return { kind: "failed", warning: "gmail_unsafe_result" };
  }

  if (result.status === "completed") {
    return {
      kind: "completed",
      signals: result.signals,
      processedMessageCount: result.processedMessageCount,
      metadata: execution.metadata ?? [],
    };
  }

  if (result.status === "blocked") {
    return { kind: "blocked" };
  }

  return { kind: "failed", warning: "gmail_runtime_error" };
}

function resolveCalendarRuntimeOutcome(
  settled: PromiseSettledResult<ProviderRuntimeCalendarExecution | CalendarReadOnlyAdapterResult>,
): CalendarRuntimeOutcome {
  if (settled.status === "rejected") {
    return { kind: "failed", warning: "calendar_runtime_error" };
  }

  const execution = unwrapCalendarExecution(settled.value);
  const result = execution.result;

  if (!isSafeCalendarRuntimeResult(result)) {
    return { kind: "failed", warning: "calendar_unsafe_result" };
  }

  if (result.status === "completed") {
    return {
      kind: "completed",
      signals: result.signals,
      processedEventCount: result.processedEventCount,
      metadata: execution.metadata ?? [],
    };
  }

  if (result.status === "blocked") {
    return { kind: "blocked" };
  }

  return { kind: "failed", warning: "calendar_runtime_error" };
}

function toGmailStatus(outcome: GmailRuntimeOutcome): "blocked" | "completed" | "error" {
  if (outcome.kind === "completed") {
    return "completed";
  }

  if (outcome.kind === "blocked") {
    return "blocked";
  }

  return "error";
}

function toCalendarStatus(outcome: CalendarRuntimeOutcome): "blocked" | "completed" | "error" {
  if (outcome.kind === "completed") {
    return "completed";
  }

  if (outcome.kind === "blocked") {
    return "blocked";
  }

  return "error";
}

function collectRuntimeWarnings(
  gmail: GmailRuntimeOutcome,
  calendar: CalendarRuntimeOutcome,
): string[] {
  const warnings: string[] = [];

  if (gmail.kind === "blocked") {
    warnings.push("gmail_blocked");
  }

  if (gmail.kind === "failed") {
    warnings.push(gmail.warning);
  }

  if (calendar.kind === "blocked") {
    warnings.push("calendar_blocked");
  }

  if (calendar.kind === "failed") {
    warnings.push(calendar.warning);
  }

  return warnings;
}

function resolveCompositionStatus(
  gmail: GmailRuntimeOutcome,
  calendar: CalendarRuntimeOutcome,
): ProviderDerivedRuntimeCompositionStatus {
  const gmailCompleted = gmail.kind === "completed";
  const calendarCompleted = calendar.kind === "completed";

  if (gmailCompleted && calendarCompleted) {
    return "completed";
  }

  if (gmailCompleted || calendarCompleted) {
    return "partial";
  }

  const gmailBlocked = gmail.kind === "blocked";
  const calendarBlocked = calendar.kind === "blocked";
  const gmailFailed = gmail.kind === "failed";
  const calendarFailed = calendar.kind === "failed";

  if (gmailBlocked && calendarBlocked) {
    return "blocked";
  }

  if (gmailFailed && calendarFailed) {
    return "error";
  }

  if (gmailBlocked || calendarBlocked) {
    return "blocked";
  }

  return "error";
}

function messageForStatus(status: ProviderDerivedRuntimeCompositionStatus): string {
  switch (status) {
    case "completed":
      return COMPLETED_MESSAGE;
    case "partial":
      return PARTIAL_MESSAGE;
    case "blocked":
      return BLOCKED_MESSAGE;
    case "error":
      return ERROR_MESSAGE;
  }
}

export async function executeProviderDerivedRuntimeComposition(
  dependencies: ProviderDerivedRuntimeCompositionDependencies,
): Promise<ProviderDerivedRuntimeCompositionResult> {
  try {
    const [gmailSettled, calendarSettled] = await Promise.allSettled([
      dependencies.executeGmail(),
      dependencies.executeCalendar(),
    ]);

    const gmailOutcome = resolveGmailRuntimeOutcome(gmailSettled);
    const calendarOutcome = resolveCalendarRuntimeOutcome(calendarSettled);
    const status = resolveCompositionStatus(gmailOutcome, calendarOutcome);
    const warnings = collectRuntimeWarnings(gmailOutcome, calendarOutcome);

    const referenceMs = dependencies.referenceMs ?? Date.now();

    const gmailAdapterSignals = gmailOutcome.kind === "completed" ? gmailOutcome.signals : [];
    const calendarSignals = calendarOutcome.kind === "completed" ? calendarOutcome.signals : [];

    const gmailMetadata = gmailOutcome.kind === "completed" ? gmailOutcome.metadata : [];
    const calendarMetadata = calendarOutcome.kind === "completed" ? calendarOutcome.metadata : [];

    const clusterSignals =
      status === "blocked" || status === "error"
        ? []
        : deriveProviderActivityClusterSignals({
            gmailMetadata,
            calendarMetadata,
            referenceMs,
          });

    const followUpSignals =
      status === "blocked" || status === "error"
        ? []
        : deriveProviderFollowUpWindowSignals({
            gmailMetadata,
            clusterSignals,
            referenceMs,
          });

    const gmailSignals = [...gmailAdapterSignals, ...clusterSignals, ...followUpSignals];

    const limited =
      status === "blocked" || status === "error"
        ? { signals: [] as ProviderDerivedSignal[], truncated: false }
        : composeAndLimitProviderRuntimeSignals({ gmailSignals, calendarSignals });

    if (limited.truncated) {
      warnings.push(PROVIDER_SIGNALS_TRUNCATED_WARNING);
    }

    const signals = limited.signals;

    const summary =
      status === "blocked" || status === "error"
        ? createEmptyProviderDerivedSignalSummary()
        : summarizeProviderDerivedSignals(signals);

    return {
      ...createRuntimeCompositionSafetyFlags(),
      status,
      gmailStatus: toGmailStatus(gmailOutcome),
      calendarStatus: toCalendarStatus(calendarOutcome),
      processedMessageCount:
        gmailOutcome.kind === "completed" ? gmailOutcome.processedMessageCount : 0,
      processedEventCount:
        calendarOutcome.kind === "completed" ? calendarOutcome.processedEventCount : 0,
      signals,
      summary,
      warnings,
      messages: [messageForStatus(status)],
    };
  } catch {
    return {
      ...createRuntimeCompositionSafetyFlags(),
      status: "error",
      gmailStatus: "error",
      calendarStatus: "error",
      processedMessageCount: 0,
      processedEventCount: 0,
      signals: [],
      summary: createEmptyProviderDerivedSignalSummary(),
      warnings: ["provider_derived_runtime_composition_failed"],
      messages: [ERROR_MESSAGE],
    };
  }
}
