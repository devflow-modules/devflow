import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import { applyflowPrisma } from "@/lib/persistence-v2/db";
import { isApplyFlowE2ERuntimeAllowed } from "./runtime-guard";
import { isAllowedE2EAuthSub } from "./session";

export type E2EAccountSeedOptions = {
  authProviderSub: string;
  /** When true, marks account pilotEligible for V2 offering/activation. */
  pilotEligible: boolean;
  /** When true, sets canonicalPersistence=v2_cloud (requires pilotEligible). */
  v2Cloud: boolean;
  email?: string | null;
};

/**
 * E2E-only account seed for multi-user V2 browser tests.
 * Fail-closed outside local/CI E2E runtime. Never available on Vercel.
 */
export async function seedE2EApplyFlowAccount(options: E2EAccountSeedOptions): Promise<{
  accountId: string;
  authProviderSub: string;
  pilotEligible: boolean;
  canonicalPersistence: ApplyFlowCanonicalPersistence;
}> {
  if (!isApplyFlowE2ERuntimeAllowed()) {
    throw new Error("e2e_seed_forbidden");
  }
  if (!isAllowedE2EAuthSub(options.authProviderSub)) {
    throw new Error("e2e_seed_invalid_sub");
  }
  if (options.v2Cloud && !options.pilotEligible) {
    throw new Error("e2e_seed_v2_requires_pilot");
  }

  const canonicalPersistence: ApplyFlowCanonicalPersistence = options.v2Cloud
    ? "v2_cloud"
    : "v1_local";
  const email = options.email ?? `${options.authProviderSub}@applyflow.local`;

  const account = await applyflowPrisma.applyFlowAccount.upsert({
    where: { authProviderSub: options.authProviderSub },
    create: {
      authProviderSub: options.authProviderSub,
      email,
      pilotEligible: options.pilotEligible,
      canonicalPersistence,
    },
    update: {
      email,
      pilotEligible: options.pilotEligible,
      canonicalPersistence,
    },
    select: {
      id: true,
      authProviderSub: true,
      pilotEligible: true,
      canonicalPersistence: true,
    },
  });

  return {
    accountId: account.id,
    authProviderSub: account.authProviderSub,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
  };
}
