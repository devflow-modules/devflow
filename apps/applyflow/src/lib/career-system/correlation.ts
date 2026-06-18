import { randomUUID } from "node:crypto";

/**
 * Server-generated correlation id for Career Suite requests. Format: `career_<uuid>`.
 *
 * It is safe to surface in client responses for support purposes. It is never derived from
 * a provider request id, token, user email, or sensitive application id.
 */
export const CAREER_CORRELATION_ID_PREFIX = "career_";

const CAREER_CORRELATION_ID_PATTERN =
  /^career_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createCareerCorrelationId(): string {
  return `${CAREER_CORRELATION_ID_PREFIX}${randomUUID()}`;
}

export function isCareerCorrelationId(value: unknown): value is string {
  return typeof value === "string" && CAREER_CORRELATION_ID_PATTERN.test(value);
}

/**
 * Accepts a server-generated correlation id or mints a new one. Client-provided values are
 * only honored when they already match the strict `career_<uuid>` format, so the client can
 * never inject arbitrary identifiers (tokens, emails, provider ids) into observability.
 */
export function resolveCareerCorrelationId(candidate?: unknown): string {
  return isCareerCorrelationId(candidate) ? candidate : createCareerCorrelationId();
}
