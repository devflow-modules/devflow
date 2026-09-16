import { NextResponse } from "next/server";
import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import {
  envToProviderRuntimeFlags,
  type ApplyFlowNangoConnectSessionEnv,
} from "./nango-connect-session-boundary";
import { mintNangoCallerSession, parseNangoCallerCookie } from "./nango-caller-session";

export type NangoRouteCallerResolution =
  | { required: false }
  | { required: true; ok: true; callerNonce: string; setCookie?: string }
  | { required: true; ok: false; reason: "missing_caller_session" };

function cookieHeaderFrom(request: { headers: { get(name: string): string | null } }): string | null {
  return request.headers.get("cookie");
}

export function nangoRuntimeNeedsCaller(env: ApplyFlowNangoConnectSessionEnv): boolean {
  const flags = evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(env));
  return flags.canUseNangoRuntime && Boolean(env.NANGO_SECRET_KEY?.trim());
}

export function resolveNangoRouteCaller(input: {
  request: { headers: { get(name: string): string | null } };
  env: ApplyFlowNangoConnectSessionEnv;
  mintIfMissing: boolean;
  secureCookie?: boolean;
}): NangoRouteCallerResolution {
  if (!nangoRuntimeNeedsCaller(input.env)) {
    return { required: false };
  }

  const secret = input.env.NANGO_SECRET_KEY?.trim() ?? "";
  const existing = parseNangoCallerCookie(cookieHeaderFrom(input.request), secret);
  if (existing) {
    return { required: true, ok: true, callerNonce: existing.nonce };
  }

  if (input.mintIfMissing) {
    const minted = mintNangoCallerSession(secret, { secure: input.secureCookie === true });
    return {
      required: true,
      ok: true,
      callerNonce: minted.nonce,
      setCookie: minted.setCookie,
    };
  }

  return { required: true, ok: false, reason: "missing_caller_session" };
}

export function attachNangoCallerCookie(response: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) {
    response.headers.append("Set-Cookie", setCookie);
  }
  return response;
}
