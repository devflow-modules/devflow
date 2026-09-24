import type { ApplyFlowAccount } from "@prisma/client";

import { getAuthenticatedApplyFlowUser, ApplyFlowAuthError } from "./auth/get-authenticated-user";
import { applyflowPrisma } from "./db";
import { isApplyFlowPersistenceV2Enabled } from "./feature-flag";

export { ApplyFlowAuthError };

export class ApplyFlowPersistenceDisabledError extends Error {
  constructor() {
    super("ApplyFlow Persistence V2 is disabled.");
  }
}

export type ApplyFlowAccountRecord = Pick<ApplyFlowAccount, "id" | "authProviderSub" | "email" | "createdAt" | "updatedAt">;

/**
 * Requires an authenticated Supabase session and returns the ApplyFlow account row.
 * Creates the account idempotently on first sign-in.
 */
export async function requireApplyFlowAccount(): Promise<ApplyFlowAccountRecord> {
  if (!isApplyFlowPersistenceV2Enabled()) {
    throw new ApplyFlowPersistenceDisabledError();
  }

  const user = await getAuthenticatedApplyFlowUser();

  const account = await applyflowPrisma.applyFlowAccount.upsert({
    where: { authProviderSub: user.authProviderSub },
    create: {
      authProviderSub: user.authProviderSub,
      email: user.email,
    },
    update: {
      ...(user.email ? { email: user.email } : {}),
    },
    select: {
      id: true,
      authProviderSub: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return account;
}
