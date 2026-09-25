import { createSupabaseServerClient } from "@/lib/supabase/server";

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
 */
export async function getAuthenticatedApplyFlowUser(): Promise<AuthenticatedApplyFlowUser> {
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
