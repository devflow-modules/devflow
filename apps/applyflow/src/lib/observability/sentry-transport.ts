/**
 * Minimal Sentry envelope transport for ApplyFlow.
 *
 * Sends ONLY pre-sanitized ApplyFlowCapturedError payloads.
 * No performance tracing, replay, profiling, or request attachment.
 * Transport failures never throw to callers.
 */

import type { ApplyFlowCapturedError } from "./error-tracking";

export type ParsedSentryDsn = {
  publicKey: string;
  host: string;
  projectId: string;
  /** Full DSN string used for envelope self-auth (never log). */
  dsn: string;
};

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number }>;

let fetchImpl: FetchLike | null = null;

export function setApplyFlowSentryFetchForTests(next: FetchLike | null): void {
  fetchImpl = next;
}

export function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  const trimmed = dsn.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const publicKey = decodeURIComponent(url.username || "").trim();
    const projectId = url.pathname.replace(/^\/+/, "").split("/")[0]?.trim() ?? "";
    const host = url.host.trim();
    if (!publicKey || !host || !projectId || !/^\d+$/.test(projectId)) return null;
    return { publicKey, host, projectId, dsn: trimmed };
  } catch {
    return null;
  }
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 32);
}

function buildEnvelope(parsed: ParsedSentryDsn, event: ApplyFlowCapturedError): string {
  const eventId = createEventId();
  const sentAt = new Date().toISOString();
  const envelopeHeader = {
    event_id: eventId,
    dsn: parsed.dsn,
    sent_at: sentAt,
    sdk: { name: "applyflow.minimal", version: "1.0.0" },
  };
  const itemHeader = { type: "event", content_type: "application/json" };
  const payload = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: event.level === "fatal" ? "fatal" : event.level === "warning" ? "warning" : "error",
    environment: event.context.environment ?? "unknown",
    release: event.context.release ?? undefined,
    transaction: event.context.route ? `applyflow:${event.context.route}` : undefined,
    tags: {
      applyflow_area: event.context.area ?? "unknown",
      ...(event.context.errorCode ? { applyflow_error_code: event.context.errorCode } : {}),
      ...(event.context.statusCode != null
        ? { applyflow_status: String(event.context.statusCode) }
        : {}),
    },
    extra: {
      digest: event.context.digest,
    },
    exception: {
      values: [
        {
          type: event.name,
          value: event.message,
          mechanism: { type: "applyflow_boundary", handled: true },
        },
      ],
    },
    sdk: { name: "applyflow.minimal", version: "1.0.0" },
  };

  return `${JSON.stringify(envelopeHeader)}\n${JSON.stringify(itemHeader)}\n${JSON.stringify(payload)}\n`;
}

export type SentryTransportResult =
  | { ok: true; status: number }
  | { ok: false; reason: "invalid_dsn" | "network" | "http"; status?: number };

/**
 * Fire a single sanitized event to Sentry. Never throws.
 */
export async function sendSanitizedApplyFlowEventToSentry(
  event: ApplyFlowCapturedError,
  dsn: string,
): Promise<SentryTransportResult> {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return { ok: false, reason: "invalid_dsn" };

  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(parsed.publicKey)}&sentry_client=applyflow.minimal%2F1.0.0`;
  const body = buildEnvelope(parsed, event);
  const doFetch = fetchImpl ?? (globalThis.fetch as FetchLike | undefined);

  if (typeof doFetch !== "function") {
    return { ok: false, reason: "network" };
  }

  try {
    const response = await doFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
      body,
    });
    if (!response.ok) {
      return { ok: false, reason: "http", status: response.status };
    }
    return { ok: true, status: response.status };
  } catch {
    return { ok: false, reason: "network" };
  }
}
