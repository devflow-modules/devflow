/**
 * Optional ApplyFlow error tracking boundary.
 *
 * Works without DSN (no-op). When APPLYFLOW_SENTRY_DSN / SENTRY_DSN /
 * NEXT_PUBLIC_APPLYFLOW_SENTRY_DSN is set, sanitized events are forwarded via
 * the minimal Sentry envelope transport — never CV, resume, notes, cookies,
 * Authorization, DB URLs, or provider keys.
 *
 * Application code must call captureApplyFlowException only — never raw Sentry APIs.
 * Operator must configure the DSN; this module does not invent credentials.
 */

import { sendSanitizedApplyFlowEventToSentry } from "./sentry-transport";

export type ApplyFlowErrorLevel = "fatal" | "error" | "warning" | "info";

export type ApplyFlowErrorContext = {
  area?: "client" | "server" | "boundary" | "api";
  route?: string;
  digest?: string;
  statusCode?: number;
  errorCode?: string;
  release?: string;
  environment?: string;
};

export type ApplyFlowCapturedError = {
  name: string;
  message: string;
  level: ApplyFlowErrorLevel;
  context: ApplyFlowErrorContext;
};

type Sink = (event: ApplyFlowCapturedError) => void;

const BLOCKED_MESSAGE_FRAGMENTS = [
  "authorization",
  "cookie",
  "set-cookie",
  "theirstack_api",
  "supabase",
  "password",
  "resume",
  "curriculum",
  "cv text",
  "profile",
  "database_url",
  "direct_url",
  "application notes",
  "private notes",
  "sentry_dsn",
  "job description",
] as const;

let sink: Sink | null = null;
let lastCaptured: ApplyFlowCapturedError | null = null;
let lastTransportOutcome: "sent" | "skipped" | "failed" | "noop" | null = null;

export function resolveApplyFlowErrorTrackingDsn(env: NodeJS.ProcessEnv = process.env): string | null {
  const dsn =
    env.APPLYFLOW_SENTRY_DSN?.trim() ||
    env.NEXT_PUBLIC_APPLYFLOW_SENTRY_DSN?.trim() ||
    env.SENTRY_DSN?.trim() ||
    "";
  return dsn.length > 0 ? dsn : null;
}

export function isApplyFlowErrorTrackingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveApplyFlowErrorTrackingDsn(env) != null;
}

/** True when DSN is present and the compiled Sentry envelope transport will be used. */
export function isApplyFlowErrorTrackingTransportReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return isApplyFlowErrorTrackingEnabled(env);
}

export function setApplyFlowErrorTrackingSinkForTests(next: Sink | null): void {
  sink = next;
}

export function getLastCapturedApplyFlowErrorForTests(): ApplyFlowCapturedError | null {
  return lastCaptured;
}

export function getLastApplyFlowErrorTransportOutcomeForTests(): typeof lastTransportOutcome {
  return lastTransportOutcome;
}

export function resetApplyFlowErrorTrackingForTests(): void {
  sink = null;
  lastCaptured = null;
  lastTransportOutcome = null;
}

function sanitizeMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim().slice(0, 240);
  const lower = trimmed.toLowerCase();
  for (const fragment of BLOCKED_MESSAGE_FRAGMENTS) {
    if (lower.includes(fragment)) {
      return "redacted_error_message";
    }
  }
  return trimmed || "unknown_error";
}

function isExpectedProductStatus(statusCode: number | undefined): boolean {
  if (statusCode == null) return false;
  return (
    statusCode === 400 ||
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 404 ||
    statusCode === 409 ||
    statusCode === 422 ||
    statusCode === 429
  );
}

function resolveRelease(explicit?: string): string | undefined {
  if (explicit) return explicit;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim();
  return sha ? sha.slice(0, 12) : undefined;
}

function resolveEnvironment(explicit?: string): string {
  if (explicit) return explicit;
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown";
}

function logSafeFallback(event: ApplyFlowCapturedError, reason: string): void {
  console.error(
    JSON.stringify({
      event: "applyflow_error_captured",
      transport: reason,
      name: event.name,
      message: event.message,
      level: event.level,
      context: event.context,
    }),
  );
}

/**
 * Capture unexpected runtime failures. Expected product 4xx codes are ignored.
 * Never throws — transport failures degrade to a sanitized console fallback.
 */
export function captureApplyFlowException(
  error: unknown,
  context: ApplyFlowErrorContext = {},
  level: ApplyFlowErrorLevel = "error",
): void {
  if (isExpectedProductStatus(context.statusCode)) {
    lastTransportOutcome = "skipped";
    return;
  }

  const name = error instanceof Error ? error.name : "Error";
  const rawMessage = error instanceof Error ? error.message : String(error);
  const event: ApplyFlowCapturedError = {
    name: name.slice(0, 80),
    message: sanitizeMessage(rawMessage),
    level,
    context: {
      area: context.area,
      route: context.route?.slice(0, 160),
      digest: context.digest?.slice(0, 64),
      statusCode: context.statusCode,
      errorCode: context.errorCode?.slice(0, 64),
      release: resolveRelease(context.release),
      environment: resolveEnvironment(context.environment),
    },
  };

  lastCaptured = event;

  if (sink) {
    lastTransportOutcome = "sent";
    try {
      sink(event);
    } catch {
      lastTransportOutcome = "failed";
    }
    return;
  }

  const dsn = resolveApplyFlowErrorTrackingDsn();
  if (!dsn) {
    lastTransportOutcome = "noop";
    return;
  }

  lastTransportOutcome = "sent";
  void sendSanitizedApplyFlowEventToSentry(event, dsn)
    .then((result) => {
      if (!result.ok) {
        lastTransportOutcome = "failed";
        logSafeFallback(event, `sentry_${result.reason}`);
      }
    })
    .catch(() => {
      lastTransportOutcome = "failed";
      logSafeFallback(event, "sentry_unexpected");
    });
}

export function captureApplyFlowServerException(
  error: unknown,
  context: Omit<ApplyFlowErrorContext, "area"> = {},
): void {
  captureApplyFlowException(error, { ...context, area: "server" });
}
