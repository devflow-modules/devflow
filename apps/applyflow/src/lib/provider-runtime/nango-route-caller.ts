import { NextResponse } from "next/server";
import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import {
  envToProviderRuntimeFlags,
  type ApplyFlowNangoConnectSessionEnv,
} from "./nango-connect-session-boundary";
import { mintNangoCallerSession, parseNangoCallerCookie } from "./nango-caller-session";
import {
  evaluateNangoRequestOrigin,
  nangoGuardHttpStatus,
  resolveAllowedNangoOrigins,
  resolveNangoCookieTransport,
  type NangoRequestGuardReason,
} from "./nango-request-guard";

export type NangoRouteCallerRequest = {
  headers: { get(name: string): string | null };
};

export type NangoRouteCallerResolution =
  | { required: false }
  | { required: true; ok: true; callerNonce: string; setCookie?: string }
  | { required: true; ok: false; reason: NangoRequestGuardReason; httpStatus: 401 | 403 };

function cookieHeaderFrom(request: NangoRouteCallerRequest): string | null {
  return request.headers.get("cookie");
}

export function nangoRuntimeNeedsCaller(env: ApplyFlowNangoConnectSessionEnv): boolean {
  const flags = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(env));
  return flags.canUseNangoRuntime && Boolean(env.NANGO_SECRET_KEY?.trim());
}

export function resolveNangoRouteCaller(input: {
  request: NangoRouteCallerRequest;
  env: ApplyFlowNangoConnectSessionEnv;
  mintIfMissing: boolean;
  now?: number;
}): NangoRouteCallerResolution {
  if (!nangoRuntimeNeedsCaller(input.env)) {
    return { required: false };
  }

  const allowed = resolveAllowedNangoOrigins(input.env);
  if (!allowed.ok) {
    return {
      required: true,
      ok: false,
      reason: allowed.reason,
      httpStatus: nangoGuardHttpStatus(allowed.reason),
    };
  }

  const origin = evaluateNangoRequestOrigin({
    originHeader: input.request.headers.get("origin"),
    allowedOrigins: allowed.origins,
  });
  if (!origin.ok) {
    return {
      required: true,
      ok: false,
      reason: origin.reason,
      httpStatus: nangoGuardHttpStatus(origin.reason),
    };
  }

  const transport = resolveNangoCookieTransport({ origin: origin.origin });
  if (!transport.ok) {
    return {
      required: true,
      ok: false,
      reason: transport.reason,
      httpStatus: nangoGuardHttpStatus(transport.reason),
    };
  }

  const secret = input.env.NANGO_SECRET_KEY?.trim() ?? "";
  const existing = parseNangoCallerCookie(cookieHeaderFrom(input.request), secret, input.now);
  if (existing) {
    return { required: true, ok: true, callerNonce: existing.nonce };
  }

  if (input.mintIfMissing) {
    const minted = mintNangoCallerSession(secret, {
      secure: transport.secure,
      now: input.now,
    });
    return {
      required: true,
      ok: true,
      callerNonce: minted.nonce,
      setCookie: minted.setCookie,
    };
  }

  return {
    required: true,
    ok: false,
    reason: "missing_caller_session",
    httpStatus: 401,
  };
}

export function attachNangoCallerCookie(response: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) {
    response.headers.append("Set-Cookie", setCookie);
  }
  return response;
}
