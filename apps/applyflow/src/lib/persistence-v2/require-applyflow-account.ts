import type { ApplyFlowAccount, ApplyFlowCanonicalPersistence } from "@prisma/client";

import { getAuthenticatedApplyFlowUser, ApplyFlowAuthError } from "./auth/get-authenticated-user";
import { applyflowPrisma } from "./db";

export { ApplyFlowAuthError };

/** @deprecated Prefer ApplyFlowV2HttpAccessError from http-access.ts (R2.2.3). */
export class ApplyFlowPersistenceDisabledError extends Error {
  constructor() {
    super("ApplyFlow Persistence V2 is disabled.");
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
      pilotEligible: false,
      canonicalPersistence: "v1_local" satisfies ApplyFlowCanonicalPersistence,
    },
    update: {
      ...(user.email ? { email: user.email } : {}),
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
