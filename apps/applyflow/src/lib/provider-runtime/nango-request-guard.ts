import { resolveCareerRuntimeEnvironment, type CareerRuntimeEnv } from "@/lib/career-system/environment";

const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Predicted local ApplyFlow origins. Extra ports require NEXT_PUBLIC_APPLYFLOW_URL.
 * These are compile-time local policy, not values reflected from the request.
 */
const LOCAL_DEVELOPMENT_ORIGINS = [
  "http://localhost",
  "http://localhost:3010",
  "http://127.0.0.1",
  "http://127.0.0.1:3010",
  "http://[::1]",
  "http://[::1]:3010",
] as const;

export type NangoRequestGuardReason =
  | "missing_caller_session"
  | "missing_request_origin"
  | "cross_origin_forbidden"
  | "insecure_transport"
  | "missing_allowed_origin";

export type NangoOriginEnv = CareerRuntimeEnv & {
  NEXT_PUBLIC_APPLYFLOW_URL?: string;
  VERCEL_URL?: string;
};

export function nangoGuardHttpStatus(reason: NangoRequestGuardReason): 401 | 403 {
  return reason === "missing_caller_session" ? 401 : 403;
}

function isExactHostname(hostname: string): boolean {
  if (!hostname || hostname.includes("*") || hostname.startsWith(".")) {
    return false;
  }
  if (hostname === "::1") {
    return true;
  }
  return /^(?:localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i.test(
    hostname,
  );
}

function parseTrustedOrigin(raw: string, requireHttps: boolean): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }
  if (requireHttps && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.protocol === "http:" && !LOCAL_HTTP_HOSTS.has(parsed.hostname)) {
    return null;
  }
  if (!isExactHostname(parsed.hostname)) {
    return null;
  }

  return parsed.origin;
}

function addConfiguredOrigin(
  origins: Set<string>,
  raw: string | undefined,
  requireHttps: boolean,
): { ok: true } | { ok: false } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: true };
  }
  const parsed = parseTrustedOrigin(trimmed, requireHttps);
  if (!parsed) {
    return { ok: false };
  }
  origins.add(parsed);
  return { ok: true };
}

/**
 * Allowed Origin list from server-side env only.
 *
 * Hosted preview/production: exact https origins from NEXT_PUBLIC_APPLYFLOW_URL
 * and/or the platform-injected VERCEL_URL for this deployment. Missing or invalid
 * configuration fails closed. Request Host / X-Forwarded-* are never consulted.
 *
 * `request.nextUrl` is not trusted: Next.js 16.1.6 can derive protocol from
 * `x-forwarded-proto` and the URL host from `Host` when `trustHostHeader` is on.
 * Comparing Origin to nextUrl.origin is therefore self-referential and is not
 * used here. Unit tests construct NextRequest from a URL string; they do not
 * simulate the Vercel proxy overwriting Host or forwarded headers.
 *
 * Development/test: NEXT_PUBLIC_APPLYFLOW_URL if set, otherwise the predicted
 * loopback list. This is not a hosted fallback.
 */
export function resolveAllowedNangoOrigins(
  env: NangoOriginEnv = {},
): { ok: true; origins: readonly string[] } | { ok: false; reason: "missing_allowed_origin" } {
  const environment = resolveCareerRuntimeEnvironment(env);
  const hosted = environment === "preview" || environment === "production";
  const origins = new Set<string>();

  if (!addConfiguredOrigin(origins, env.NEXT_PUBLIC_APPLYFLOW_URL, hosted).ok) {
    return { ok: false, reason: "missing_allowed_origin" };
  }
  if (!addConfiguredOrigin(origins, env.VERCEL_URL, true).ok) {
    return { ok: false, reason: "missing_allowed_origin" };
  }

  if (hosted) {
    if (origins.size === 0) {
      return { ok: false, reason: "missing_allowed_origin" };
    }
    return { ok: true, origins: [...origins] };
  }

  if (origins.size === 0) {
    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) {
      origins.add(origin);
    }
  }

  return { ok: true, origins: [...origins] };
}

/**
 * Cookie Secure flag after the Origin header has already been allowlisted.
 * Hosted allowlists are https-only. HTTP without Secure is only possible for
 * loopback origins in development/test.
 */
export function resolveNangoCookieTransport(input: {
  origin: string;
}): { ok: true; secure: boolean } | { ok: false; reason: "insecure_transport" } {
  let parsed: URL;
  try {
    parsed = new URL(input.origin);
  } catch {
    return { ok: false, reason: "insecure_transport" };
  }

  if (parsed.protocol === "https:") {
    return { ok: true, secure: true };
  }

  if (parsed.protocol === "http:" && LOCAL_HTTP_HOSTS.has(parsed.hostname)) {
    return { ok: true, secure: false };
  }

  return { ok: false, reason: "insecure_transport" };
}

/**
 * Compare the browser Origin header to the server-side allowlist.
 * Origin is never used to construct the allowlist. Missing, empty, invalid,
 * or the string `null` is rejected.
 */
export function evaluateNangoRequestOrigin(input: {
  originHeader: string | null | undefined;
  allowedOrigins: readonly string[];
}): { ok: true; origin: string } | { ok: false; reason: "missing_request_origin" | "cross_origin_forbidden" } {
  const originHeader = input.originHeader?.trim() ?? "";
  if (!originHeader || originHeader === "null") {
    return { ok: false, reason: "missing_request_origin" };
  }

  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(originHeader).origin;
  } catch {
    return { ok: false, reason: "missing_request_origin" };
  }

  if (parsedOrigin !== originHeader) {
    return { ok: false, reason: "cross_origin_forbidden" };
  }

  if (!input.allowedOrigins.includes(parsedOrigin)) {
    return { ok: false, reason: "cross_origin_forbidden" };
  }

  return { ok: true, origin: parsedOrigin };
}
