import { ApplyFlowAuthError, getAuthenticatedApplyFlowUser } from "@/lib/persistence-v2/auth/get-authenticated-user";
import { resolveApplyFlowSupabasePublicConfig } from "@/lib/persistence-v2/env";
import { isApplyFlowE2ERuntimeAllowed } from "@/lib/e2e/runtime-guard";
import { readE2ESessionAuthSub } from "@/lib/e2e/session";

import { isTheirStackSearchEnabled } from "./theirstack-access";
import type { JobSourceErrorCode, JobSourceId } from "./types";

export type JobSearchCaller =
  | { kind: "authenticated"; authProviderSub: string }
  | { kind: "anonymous_local"; reason: "auth_not_configured" };

export type JobSearchAccessDecision =
  | { ok: true; caller: JobSearchCaller }
  | { ok: false; error: Extract<JobSourceErrorCode, "auth_required" | "provider_not_available" | "provider_not_configured"> };

/**
 * Resolves authoritative search caller from the Supabase session (or E2E session when gated).
 * Never reads accountId/userId from the request body.
 */
export async function resolveJobSearchCaller(): Promise<
  | { ok: true; caller: JobSearchCaller }
  | { ok: false; error: "auth_required" | "auth_not_configured" }
> {
  if (isApplyFlowE2ERuntimeAllowed()) {
    const e2eSub = await readE2ESessionAuthSub();
    if (e2eSub) {
      return { ok: true, caller: { kind: "authenticated", authProviderSub: e2eSub } };
    }
  }

  if (!resolveApplyFlowSupabasePublicConfig()) {
    return { ok: true, caller: { kind: "anonymous_local", reason: "auth_not_configured" } };
  }
  try {
    const user = await getAuthenticatedApplyFlowUser();
    return { ok: true, caller: { kind: "authenticated", authProviderSub: user.authProviderSub } };
  } catch (error) {
    if (error instanceof ApplyFlowAuthError && error.code === "unauthenticated") {
      return { ok: false, error: "auth_required" };
    }
    if (error instanceof ApplyFlowAuthError && error.code === "auth_not_configured") {
      return { ok: true, caller: { kind: "anonymous_local", reason: "auth_not_configured" } };
    }
    return { ok: false, error: "auth_required" };
  }
}

/**
 * Provider authorization after caller is known.
 * - TheirStack: authenticated + cost-control gate
 * - Free providers: authenticated when Supabase is configured; anonymous only when auth is not configured (local-first)
 */
export function authorizeJobSearchProvider(
  provider: JobSourceId,
  caller: JobSearchCaller,
  env: NodeJS.ProcessEnv = process.env,
): JobSearchAccessDecision {
  if (provider === "theirstack") {
    if (caller.kind !== "authenticated") {
      return { ok: false, error: "auth_required" };
    }
    if (!env.THEIRSTACK_API_KEY?.trim()) {
      return { ok: false, error: "provider_not_configured" };
    }
    if (!isTheirStackSearchEnabled(env)) {
      return { ok: false, error: "provider_not_available" };
    }
    return { ok: true, caller };
  }

  if (caller.kind === "anonymous_local") {
    return { ok: true, caller };
  }
  return { ok: true, caller };
}
