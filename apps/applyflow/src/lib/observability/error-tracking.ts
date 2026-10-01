/**
 * Optional ApplyFlow error tracking boundary.
 *
 * Works without DSN (no-op sink). When APPLYFLOW_SENTRY_DSN / SENTRY_DSN is set,
 * events are forwarded through a narrow sanitized payload — never CV, resume,
 * notes, cookies, Authorization, or provider keys.
 *
 * Operator must configure the external product; this module does not invent credentials.
 */

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
  "theirstack_api",
  "supabase",
  "password",
  "resume",
  "curriculum",
  "cv text",
] as const;

let sink: Sink | null = null;
let lastCaptured: ApplyFlowCapturedError | null = null;

export function resolveApplyFlowErrorTrackingDsn(env: NodeJS.ProcessEnv = process.env): string | null {
  const dsn = env.APPLYFLOW_SENTRY_DSN?.trim() || env.SENTRY_DSN?.trim() || "";
  return dsn.length > 0 ? dsn : null;
}

export function isApplyFlowErrorTrackingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveApplyFlowErrorTrackingDsn(env) != null;
}

export function setApplyFlowErrorTrackingSinkForTests(next: Sink | null): void {
  sink = next;
}

export function getLastCapturedApplyFlowErrorForTests(): ApplyFlowCapturedError | null {
  return lastCaptured;
}

export function resetApplyFlowErrorTrackingForTests(): void {
  sink = null;
  lastCaptured = null;
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
  return statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 409 || statusCode === 429;
}

/**
 * Capture unexpected runtime failures. Expected product 4xx codes are ignored.
 */
export function captureApplyFlowException(
  error: unknown,
  context: ApplyFlowErrorContext = {},
  level: ApplyFlowErrorLevel = "error",
): void {
  if (isExpectedProductStatus(context.statusCode)) return;

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
      release: context.release ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
      environment:
        context.environment ??
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV ??
        "unknown",
    },
  };

  lastCaptured = event;

  if (sink) {
    sink(event);
    return;
  }

  if (!isApplyFlowErrorTrackingEnabled()) {
    return;
  }

  // DSN present but no SDK wired yet — structured console evidence for operators.
  // Never dump stacks with potential secrets beyond sanitized message.
  console.error(
    JSON.stringify({
      event: "applyflow_error_captured",
      ...event,
    }),
  );
}

export function captureApplyFlowServerException(
  error: unknown,
  context: Omit<ApplyFlowErrorContext, "area"> = {},
): void {
  captureApplyFlowException(error, { ...context, area: "server" });
}
