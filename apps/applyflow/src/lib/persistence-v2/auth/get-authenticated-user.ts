import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readE2ESessionAuthSub } from "@/lib/e2e/session";
import { isApplyFlowE2ERuntimeAllowed } from "@/lib/e2e/runtime-guard";

import { resolveApplyFlowSupabasePublicConfig } from "../env";

export type AuthenticatedApplyFlowUser = {
  authProviderSub: string;
  email: string | null;
};

export class ApplyFlowAuthError extends Error {
  readonly code: "auth_not_configured" | "unauthenticated";

  constructor(code: ApplyFlowAuthError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Resolves the authenticated Supabase user from the server session (cookies).
 * Never accepts user id from the client.
 *
 * E2E-only signed session is accepted solely when the fail-closed E2E runtime gate is open.
 */
export async function getAuthenticatedApplyFlowUser(): Promise<AuthenticatedApplyFlowUser> {
  if (isApplyFlowE2ERuntimeAllowed()) {
    const e2eSub = await readE2ESessionAuthSub();
    if (e2eSub) {
      return { authProviderSub: e2eSub, email: "e2e@applyflow.local" };
    }
  }

  if (!resolveApplyFlowSupabasePublicConfig()) {
    throw new ApplyFlowAuthError("auth_not_configured", "Supabase auth is not configured.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApplyFlowAuthError("unauthenticated", "Authentication required.");
  }

  return {
    authProviderSub: data.user.id,
    email: data.user.email ?? null,
  };
}
