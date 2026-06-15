// Server-only provider-derived runtime preview boundary.
// Do not import this file from client components.

import {
  createEmptyProviderDerivedSignalSummary,
  type ProviderConnectionVerificationResult,
  type ProviderConnectionVerificationState,
} from "@devflow/career-sync";
import { executeApplyFlowCalendarReadOnlyRuntimeBoundary } from "./calendar-readonly-runtime-boundary";
import type { ApplyFlowCalendarReadOnlyRuntimeDeps } from "./calendar-readonly-runtime-boundary";
import { executeApplyFlowGmailReadOnlyRuntimeBoundary } from "./gmail-readonly-runtime-boundary";
import type { ApplyFlowGmailReadOnlyRuntimeDeps } from "./gmail-readonly-runtime-boundary";
import type { ApplyFlowNangoConnectSessionEnv } from "./nango-connect-session-boundary";
import {
  handleApplyFlowNangoConnectionVerification,
  type ApplyFlowNangoConnectionVerificationDeps,
} from "./nango-connection-verification-boundary";
import { executeApplyFlowProviderDerivedRuntimeBoundary } from "./provider-derived-runtime-boundary";
import type { ProviderDerivedRuntimeCompositionResult } from "./provider-derived-runtime-composition";

export const PROVIDER_DERIVED_RUNTIME_PREVIEW_MAX_LIMIT = 50;
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_MESSAGES = 10;
export const PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_EVENTS = 10;

export const PROVIDER_DERIVED_RUNTIME_PREVIEW_BLOCKED_MESSAGE =
  "Provider preview is blocked until verified Gmail and Calendar connections are available.";

export type ProviderDerivedRuntimePreviewRequest = {
  explicitConsent: true;
  window?: {
    from?: string;
    to?: string;
  };
  limits: {
    maxMessages: number;
    maxEvents: number;
  };
};

export type ProviderDerivedRuntimePreviewRequestError =
  | "invalid_json"
  | "missing_consent"
  | "invalid_limits"
  | "invalid_window";

export type ProviderDerivedRuntimePreviewDependencies = {
  verifyGmailConnection: () => Promise<ProviderConnectionVerificationResult>;
  verifyCalendarConnection: () => Promise<ProviderConnectionVerificationResult>;
  executeComposition?: typeof executeApplyFlowProviderDerivedRuntimeBoundary;
  gmailRuntimeDeps?: ApplyFlowGmailReadOnlyRuntimeDeps;
  calendarRuntimeDeps?: ApplyFlowCalendarReadOnlyRuntimeDeps;
};

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function createBlockedPreviewResult(warnings: string[]): ProviderDerivedRuntimeCompositionResult {
  return {
    runtime: "nango",
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    gmailStatus: "blocked",
    calendarStatus: "blocked",
    processedMessageCount: 0,
    processedEventCount: 0,
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
    signals: [],
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings,
    messages: [PROVIDER_DERIVED_RUNTIME_PREVIEW_BLOCKED_MESSAGE],
  };
}

function connectionWarningForState(
  provider: "gmail" | "calendar",
  state: ProviderConnectionVerificationState,
): string {
  if (state === "not_connected") {
    return provider === "gmail"
      ? "gmail_connection_not_verified"
      : "calendar_connection_not_verified";
  }

  return provider === "gmail"
    ? "gmail_connection_verification_error"
    : "calendar_connection_verification_error";
}

export function parseProviderDerivedRuntimePreviewRequest(body: unknown):
  | { ok: true; request: ProviderDerivedRuntimePreviewRequest }
  | {
      ok: false;
      error: ProviderDerivedRuntimePreviewRequestError;
      httpStatus: 400 | 403;
    } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "invalid_json", httpStatus: 400 };
  }

  if (!isPlainObject(body.limits)) {
    return { ok: false, error: "invalid_limits", httpStatus: 400 };
  }

  const maxMessages = body.limits.maxMessages;
  const maxEvents = body.limits.maxEvents;

  if (
    typeof maxMessages !== "number" ||
    !Number.isInteger(maxMessages) ||
    maxMessages < 1 ||
    maxMessages > PROVIDER_DERIVED_RUNTIME_PREVIEW_MAX_LIMIT
  ) {
    return { ok: false, error: "invalid_limits", httpStatus: 400 };
  }

  if (
    typeof maxEvents !== "number" ||
    !Number.isInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > PROVIDER_DERIVED_RUNTIME_PREVIEW_MAX_LIMIT
  ) {
    return { ok: false, error: "invalid_limits", httpStatus: 400 };
  }

  let window: ProviderDerivedRuntimePreviewRequest["window"];

  if (body.window != null) {
    if (!isPlainObject(body.window)) {
      return { ok: false, error: "invalid_window", httpStatus: 400 };
    }

    const from = body.window.from;
    const to = body.window.to;

    if (from != null && (typeof from !== "string" || !isValidIsoDate(from))) {
      return { ok: false, error: "invalid_window", httpStatus: 400 };
    }

    if (to != null && (typeof to !== "string" || !isValidIsoDate(to))) {
      return { ok: false, error: "invalid_window", httpStatus: 400 };
    }

    if (
      typeof from === "string" &&
      typeof to === "string" &&
      Date.parse(from) > Date.parse(to)
    ) {
      return { ok: false, error: "invalid_window", httpStatus: 400 };
    }

    window = {
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
    };
  }

  if (body.explicitConsent !== true) {
    return { ok: false, error: "missing_consent", httpStatus: 403 };
  }

  return {
    ok: true,
    request: {
      explicitConsent: true,
      window,
      limits: {
        maxMessages,
        maxEvents,
      },
    },
  };
}

export function createApplyFlowProviderDerivedRuntimePreviewVerifiers(input: {
  env: ApplyFlowNangoConnectSessionEnv;
  requestedAt: string;
  verificationDeps: ApplyFlowNangoConnectionVerificationDeps;
}): Pick<
  ProviderDerivedRuntimePreviewDependencies,
  "verifyGmailConnection" | "verifyCalendarConnection"
> {
  return {
    verifyGmailConnection: () =>
      handleApplyFlowNangoConnectionVerification(
        { provider: "gmail", explicitConsent: true },
        {
          env: input.env,
          verificationDeps: input.verificationDeps,
          requestedAt: input.requestedAt,
        },
      ),
    verifyCalendarConnection: () =>
      handleApplyFlowNangoConnectionVerification(
        { provider: "calendar", explicitConsent: true },
        {
          env: input.env,
          verificationDeps: input.verificationDeps,
          requestedAt: input.requestedAt,
        },
      ),
  };
}

export async function handleProviderDerivedRuntimePreview(
  request: ProviderDerivedRuntimePreviewRequest,
  deps: {
    env: ApplyFlowNangoConnectSessionEnv;
    requestedAt: string;
    verifyGmailConnection: () => Promise<ProviderConnectionVerificationResult>;
    verifyCalendarConnection: () => Promise<ProviderConnectionVerificationResult>;
    gmailRuntimeDeps?: ApplyFlowGmailReadOnlyRuntimeDeps;
    calendarRuntimeDeps?: ApplyFlowCalendarReadOnlyRuntimeDeps;
    executeComposition?: typeof executeApplyFlowProviderDerivedRuntimeBoundary;
  },
): Promise<ProviderDerivedRuntimeCompositionResult> {
  const [gmailVerification, calendarVerification] = await Promise.all([
    deps.verifyGmailConnection(),
    deps.verifyCalendarConnection(),
  ]);

  const warnings: string[] = [];

  if (gmailVerification.state !== "connected") {
    warnings.push(connectionWarningForState("gmail", gmailVerification.state));
  }

  if (calendarVerification.state !== "connected") {
    warnings.push(connectionWarningForState("calendar", calendarVerification.state));
  }

  if (warnings.length > 0) {
    return createBlockedPreviewResult(warnings);
  }

  const executeComposition = deps.executeComposition ?? executeApplyFlowProviderDerivedRuntimeBoundary;

  // connectionVerified is set only after successful server-side Nango verification above.
  return executeComposition({
    executeGmail: () =>
      executeApplyFlowGmailReadOnlyRuntimeBoundary(
        { explicitConsent: true },
        {
          env: deps.env,
          connectionVerified: true,
          requestedAt: deps.requestedAt,
          window: {
            from: request.window?.from,
            to: request.window?.to,
            maxMessages: request.limits.maxMessages,
          },
          runtimeDeps: deps.gmailRuntimeDeps,
        },
      ),
    executeCalendar: () =>
      executeApplyFlowCalendarReadOnlyRuntimeBoundary(
        { explicitConsent: true },
        {
          env: deps.env,
          connectionVerified: true,
          requestedAt: deps.requestedAt,
          window: {
            from: request.window?.from,
            to: request.window?.to,
            maxEvents: request.limits.maxEvents,
          },
          runtimeDeps: deps.calendarRuntimeDeps,
        },
      ),
  });
}

export function createBlockedProviderDerivedRuntimePreviewResult(
  error: ProviderDerivedRuntimePreviewRequestError,
): ProviderDerivedRuntimeCompositionResult {
  return createBlockedPreviewResult([`preview_request_${error}`]);
}

export function resolveProviderDerivedRuntimePreviewHttpStatus(input: {
  requestError?: ProviderDerivedRuntimePreviewRequestError;
  result?: ProviderDerivedRuntimeCompositionResult;
}): number {
  if (input.requestError === "missing_consent") {
    return 403;
  }

  if (
    input.requestError === "invalid_json" ||
    input.requestError === "invalid_limits" ||
    input.requestError === "invalid_window"
  ) {
    return 400;
  }

  return 200;
}
