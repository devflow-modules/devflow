import { createHash } from "node:crypto";
import type { ProviderKind } from "@devflow/career-sync";

import { ApplyFlowAuthError, requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";

import type { ApplyFlowNangoConnectSessionEnv } from "./nango-connect-session-boundary";
import { parseNangoCallerCookie } from "./nango-caller-session";
import {
  evaluateNangoRequestOrigin,
  nangoGuardHttpStatus,
  resolveAllowedNangoOrigins,
  type NangoRequestGuardReason,
} from "./nango-request-guard";
import { buildApplyFlowNangoEndUserId } from "./nango-server-provider";

/**
 * Account-owned Nango identity.
 * Derived only from the server account id. Browser caller cookies and client
 * end_user_id values are not authorization input.
 */
export function buildApplyFlowNangoAccountEndUserId(provider: ProviderKind, accountId: string): string {
  const trimmed = accountId.trim();
  if (!trimmed) {
    throw new Error("invalid_nango_account");
  }
  const hash = createHash("sha256")
    .update(`applyflow-nango-account:${trimmed}:${provider}`)
    .digest("hex")
    .slice(0, 32);
  return `applyflow-acct-${provider}-${hash}`;
}

export function resolveNangoEndUserId(
  provider: ProviderKind,
  owner: { accountId?: string | null; callerNonce?: string | null },
): string {
  if (owner.accountId?.trim()) {
    return buildApplyFlowNangoAccountEndUserId(provider, owner.accountId);
  }
  if (owner.callerNonce) {
    return buildApplyFlowNangoEndUserId(provider, owner.callerNonce);
  }
  throw new Error("missing_nango_owner");
}

export type NangoPersonalRouteFailure = {
  ok: false;
  reason: NangoRequestGuardReason | "unauthenticated" | "auth_not_configured" | "legacy_browser_adoption_refused";
  httpStatus: number;
};

export type NangoPersonalRouteSuccess = {
  ok: true;
  accountId: string;
  legacyBrowserCookiePresent: boolean;
};

type RouteRequest = {
  headers: { get(name: string): string | null };
};

/**
 * Origin/CSRF first, then the authenticated ApplyFlow account.
 * Does not mint or trust af_nango_caller as ownership.
 */
export async function resolveNangoPersonalRoute(input: {
  request: RouteRequest;
  env: ApplyFlowNangoConnectSessionEnv;
  adoptLegacyBrowserConnection?: boolean;
}): Promise<NangoPersonalRouteSuccess | NangoPersonalRouteFailure> {
  if (input.adoptLegacyBrowserConnection) {
    return { ok: false, reason: "legacy_browser_adoption_refused", httpStatus: 409 };
  }

  const allowed = resolveAllowedNangoOrigins(input.env);
  if (!allowed.ok) {
    return {
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
      ok: false,
      reason: origin.reason,
      httpStatus: nangoGuardHttpStatus(origin.reason),
    };
  }

  const secret = input.env.NANGO_SECRET_KEY?.trim() ?? "";
  const legacyBrowserCookiePresent = Boolean(
    secret && parseNangoCallerCookie(input.request.headers.get("cookie"), secret),
  );

  try {
    const account = await requireApplyFlowAccount();
    return { ok: true, accountId: account.id, legacyBrowserCookiePresent };
  } catch (error) {
    if (error instanceof ApplyFlowAuthError) {
      if (error.code === "auth_not_configured") {
        return { ok: false, reason: "auth_not_configured", httpStatus: 503 };
      }
      return { ok: false, reason: "unauthenticated", httpStatus: 401 };
    }
    throw error;
  }
}
