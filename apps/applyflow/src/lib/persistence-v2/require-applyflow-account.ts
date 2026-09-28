import type { ApplyFlowAccount, ApplyFlowCanonicalPersistence } from "@prisma/client";

import { getAuthenticatedApplyFlowUser, ApplyFlowAuthError } from "./auth/get-authenticated-user";
import { applyflowPrisma } from "./db";
import { isApplyFlowPersistenceV2Enabled } from "./feature-flag";

export { ApplyFlowAuthError };

export class ApplyFlowPersistenceDisabledError extends Error {
  constructor() {
    super("ApplyFlow Persistence V2 is disabled.");
  }
}

/**
 * TEMPORARY compatibility gate for V2 HTTP surfaces until R2.2.3.
 *
 * Account provisioning is intentionally decoupled from the GLOBAL flag, but
 * existing `/api/applyflow/v2/*` routes must remain fail-closed when GLOBAL is
 * OFF. Call sites that previously relied on `requireApplyFlowAccount()` to
 * throw this error should use this helper (or an equivalent explicit flag
 * check) until HTTP enforcement is rewritten for account-scoped modes.
 *
 * Remove / replace in R2.2.3_HTTP_ENFORCEMENT.
 */
export function assertApplyFlowPersistenceV2GloballyEnabled(): void {
  if (!isApplyFlowPersistenceV2Enabled()) {
    throw new ApplyFlowPersistenceDisabledError();
  }
}

export type ApplyFlowAccountRecord = Pick<
  ApplyFlowAccount,
  | "id"
  | "authProviderSub"
  | "email"
  | "pilotEligible"
  | "canonicalPersistence"
  | "createdAt"
  | "updatedAt"
>;

/**
 * Requires an authenticated Supabase session and returns the ApplyFlow account row.
 * Creates the account idempotently on first sign-in with schema defaults:
 *   pilotEligible=false, canonicalPersistence=v1_local
 *
 * Does NOT require APPLYFLOW_PERSISTENCE_V2=true (bootstrap / pilot grant path).
 * Does NOT accept caller-supplied accountId or authProviderSub.
 * Does NOT reset pilotEligible / canonicalPersistence on update.
 */
export async function requireApplyFlowAccount(): Promise<ApplyFlowAccountRecord> {
  const user = await getAuthenticatedApplyFlowUser();

  const account = await applyflowPrisma.applyFlowAccount.upsert({
    where: { authProviderSub: user.authProviderSub },
    create: {
      authProviderSub: user.authProviderSub,
      email: user.email,
      // Explicit defaults for clarity; Prisma schema also defaults these.
      pilotEligible: false,
      canonicalPersistence: "v1_local" satisfies ApplyFlowCanonicalPersistence,
    },
    update: {
      ...(user.email ? { email: user.email } : {}),
      // Intentionally omit pilotEligible / canonicalPersistence — never reset.
    },
    select: {
      id: true,
      authProviderSub: true,
      email: true,
      pilotEligible: true,
      canonicalPersistence: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return account;
}
