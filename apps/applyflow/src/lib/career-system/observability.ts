import { resolveCareerRuntimeEnvironment } from "./environment";

/**
 * Client-safe operational observability for the Career Suite.
 *
 * Events carry only coarse, non-sensitive operational metadata. Raw prompts, raw responses,
 * resumes, job descriptions, emails, calendar events, full CareerBundles, API keys, tokens,
 * Authorization headers, provider request ids, and chain-of-thought are NEVER recorded.
 */
export const CAREER_OPERATIONAL_EVENTS = [
  "career_agent_completed",
  "career_agent_blocked",
  "career_chat_completed",
  "career_llm_completed",
  "career_llm_failed",
  "career_provider_signal_loaded",
  "career_health_probe_completed",
  "career_feedback_submitted",
] as const;

export type CareerOperationalEventName = (typeof CAREER_OPERATIONAL_EVENTS)[number];

export type CareerOperationalEvent = {
  eventName: CareerOperationalEventName;
  timestamp: string;
  route: string;
  outcome: "success" | "blocked" | "error";
  durationMs: number;
  environment: string;
  correlationId?: string;
  provider?: string;
  agent?: string;
  task?: string;
  errorCode?: string;
  externalProviderCalled?: boolean;
  persisted?: false;
  toolExecutionOccurred?: false;
};

/**
 * Keys that may legitimately appear in an operational event. Any other key is dropped during
 * sanitization so that accidental sensitive fields never reach a log sink.
 */
const ALLOWED_EVENT_KEYS = new Set<keyof CareerOperationalEvent>([
  "eventName",
  "timestamp",
  "route",
  "outcome",
  "durationMs",
  "environment",
  "correlationId",
  "provider",
  "agent",
  "task",
  "errorCode",
  "externalProviderCalled",
  "persisted",
  "toolExecutionOccurred",
]);

/**
 * Substrings that indicate a forbidden/sensitive value. If any string field contains one of
 * these, the field is redacted. This is a defense-in-depth net on top of allowlisting keys.
 */
const FORBIDDEN_VALUE_PATTERN =
  /\bbearer\b|\bsk-[a-z0-9]/i;

function isAllowedEventName(value: unknown): value is CareerOperationalEventName {
  return (
    typeof value === "string" &&
    (CAREER_OPERATIONAL_EVENTS as readonly string[]).includes(value)
  );
}

function redactStringValue(value: string): string {
  return FORBIDDEN_VALUE_PATTERN.test(value) ? "[redacted]" : value;
}

export type CareerOperationalEventInput = Partial<CareerOperationalEvent> & {
  eventName: CareerOperationalEventName;
  route: string;
  outcome: CareerOperationalEvent["outcome"];
};

/**
 * Produces a sanitized, client-safe operational event:
 * - unknown keys are dropped (allowlist);
 * - `persisted` / `toolExecutionOccurred` are forced to `false`;
 * - string values that look like secrets are redacted;
 * - `durationMs` is coerced to a non-negative integer.
 */
export function sanitizeCareerOperationalEvent(
  input: CareerOperationalEventInput,
  env: Parameters<typeof resolveCareerRuntimeEnvironment>[0] = process.env,
): CareerOperationalEvent {
  const eventName: CareerOperationalEventName = isAllowedEventName(input.eventName)
    ? input.eventName
    : "career_agent_blocked";

  const sanitized: CareerOperationalEvent = {
    eventName,
    timestamp: typeof input.timestamp === "string" ? input.timestamp : new Date().toISOString(),
    route: redactStringValue(String(input.route ?? "unknown")),
    outcome: input.outcome,
    durationMs: Math.max(0, Math.round(Number(input.durationMs ?? 0)) || 0),
    environment:
      typeof input.environment === "string"
        ? input.environment
        : resolveCareerRuntimeEnvironment(env),
    persisted: false,
    toolExecutionOccurred: false,
  };

  for (const key of ["correlationId", "provider", "agent", "task", "errorCode"] as const) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0 && ALLOWED_EVENT_KEYS.has(key)) {
      sanitized[key] = redactStringValue(value);
    }
  }

  if (typeof input.externalProviderCalled === "boolean") {
    sanitized.externalProviderCalled = input.externalProviderCalled;
  }

  return sanitized;
}

export type CareerLogLevel = "debug" | "info" | "warn" | "error";

export type CareerLogger = {
  log: (level: CareerLogLevel, event: CareerOperationalEventInput) => CareerOperationalEvent;
  info: (event: CareerOperationalEventInput) => CareerOperationalEvent;
  warn: (event: CareerOperationalEventInput) => CareerOperationalEvent;
  error: (event: CareerOperationalEventInput) => CareerOperationalEvent;
};

type CareerLoggerSink = (line: string) => void;

/**
 * Structured server-side logger. Emits a single sanitized JSON line per event. There is no
 * raw request/response payload, no secret, and no full object. Stack traces are only attached
 * in non-production environments and only to the local sink (never serialized into events).
 */
export function createCareerLogger(options?: {
  sink?: CareerLoggerSink;
  env?: Parameters<typeof resolveCareerRuntimeEnvironment>[0];
}): CareerLogger {
  const sink: CareerLoggerSink =
    options?.sink ??
    ((line) => {
      // eslint-disable-next-line no-console
      console.log(line);
    });
  const env = options?.env ?? process.env;

  function log(level: CareerLogLevel, event: CareerOperationalEventInput): CareerOperationalEvent {
    const sanitized = sanitizeCareerOperationalEvent(event, env);
    sink(
      JSON.stringify({
        level,
        ...sanitized,
        safeForClient: true,
      }),
    );
    return sanitized;
  }

  return {
    log,
    info: (event) => log("info", event),
    warn: (event) => log("warn", event),
    error: (event) => log("error", event),
  };
}

export const careerLogger = createCareerLogger();
