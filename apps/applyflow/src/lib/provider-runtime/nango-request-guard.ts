import { resolveCareerRuntimeEnvironment, type CareerRuntimeEnv } from "@/lib/career-system/environment";

const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type NangoRequestUrl = {
  origin: string;
  protocol: string;
  hostname: string;
};

export type NangoRequestGuardReason =
  | "missing_caller_session"
  | "missing_request_origin"
  | "cross_origin_forbidden"
  | "insecure_transport";

export function nangoGuardHttpStatus(reason: NangoRequestGuardReason): 401 | 403 {
  return reason === "missing_caller_session" ? 401 : 403;
}

/**
 * Cookie Secure flag and HTTPS policy.
 *
 * Hosted preview/production (VERCEL_ENV / CAREER_RUNTIME_ENVIRONMENT / NODE_ENV)
 * always require HTTPS via NextRequest.nextUrl — never by reading
 * `x-forwarded-proto`, Host, or Origin as the transport source of truth.
 * HTTP without Secure is allowed only for loopback in development/test.
 * Anything else fails closed.
 */
export function resolveNangoCookieTransport(input: {
  env?: CareerRuntimeEnv;
  requestUrl: NangoRequestUrl;
}): { ok: true; secure: boolean } | { ok: false; reason: "insecure_transport" } {
  const environment = resolveCareerRuntimeEnvironment(input.env);
  const protocol = input.requestUrl.protocol;
  const hostname = input.requestUrl.hostname;

  if (environment === "preview" || environment === "production") {
    if (protocol !== "https:") {
      return { ok: false, reason: "insecure_transport" };
    }
    return { ok: true, secure: true };
  }

  if (protocol === "https:") {
    return { ok: true, secure: true };
  }

  if (protocol === "http:" && LOCAL_HTTP_HOSTS.has(hostname)) {
    return { ok: true, secure: false };
  }

  return { ok: false, reason: "insecure_transport" };
}

/**
 * Compare the browser Origin header to the server-derived request URL origin.
 * Origin is never used to *construct* the allowed origin.
 * Missing, empty, invalid, or the string `null` is rejected.
 */
export function evaluateNangoRequestOrigin(input: {
  originHeader: string | null | undefined;
  requestOrigin: string;
}): { ok: true } | { ok: false; reason: "missing_request_origin" | "cross_origin_forbidden" } {
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

  if (parsedOrigin !== originHeader || parsedOrigin !== input.requestOrigin) {
    return { ok: false, reason: "cross_origin_forbidden" };
  }

  return { ok: true };
}
