import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import { applyflowPrisma } from "@/lib/persistence-v2/db";
import { assertApplyFlowDestructiveDbTargetAllowed } from "@/lib/persistence-v2/db-target-guard";
import rolloutAccountIds from "./rollout-account-ids.json";
import { isApplyFlowE2ERuntimeAllowed } from "./runtime-guard";
import { isAllowedE2EAuthSub } from "./session";

const pinnedIds = rolloutAccountIds as Record<string, { id: string; selected: boolean }>;

export type E2EAccountSeedOptions = {
  authProviderSub: string;
  /** When true, marks account pilotEligible for V2 offering/activation. */
  pilotEligible: boolean;
  /** When true, sets canonicalPersistence=v2_cloud. */
  v2Cloud: boolean;
  /** Explicit local E2E path for selected cloud accounts with pilot revoked (read-only). */
  allowCloudWithoutPilot?: boolean;
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
  if (options.v2Cloud && !options.pilotEligible && !options.allowCloudWithoutPilot) {
    throw new Error("e2e_seed_v2_requires_pilot");
  }

  assertApplyFlowDestructiveDbTargetAllowed();

  const canonicalPersistence: ApplyFlowCanonicalPersistence = options.v2Cloud
    ? "v2_cloud"
    : "v1_local";
  const email = options.email ?? `${options.authProviderSub}@applyflow.local`;
  const pinnedId = pinnedIds[options.authProviderSub]?.id ?? null;
  if (pinnedId) {
    await ensurePinnedE2EAccountId(options.authProviderSub, pinnedId);
  }

  const account = await applyflowPrisma.applyFlowAccount.upsert({
    where: { authProviderSub: options.authProviderSub },
    create: {
      ...(pinnedId ? { id: pinnedId } : {}),
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

  // Idempotent V2 E2E: wipe leftover Jobs/Applications so dirty local Postgres
  // cannot poison Active-queue / discovery-save assertions across runs.
  await applyflowPrisma.applyFlowApplication.deleteMany({ where: { accountId: account.id } });
  await applyflowPrisma.applyFlowJob.deleteMany({ where: { accountId: account.id } });

  return {
    accountId: account.id,
    authProviderSub: account.authProviderSub,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
  };
}

async function deleteAccountTree(accountId: string): Promise<void> {
  await applyflowPrisma.$transaction([
    applyflowPrisma.applyFlowExtensionGrant.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowCareerEventRecord.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowInboundResponseRecord.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowContactInteractionRecord.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowContactRecord.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowPersonalImportSession.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowProfileDocument.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowApplication.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowJob.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowMigrationSession.deleteMany({ where: { accountId } }),
    applyflowPrisma.applyFlowAccount.delete({ where: { id: accountId } }),
  ]);
}

/** Local E2E only. Recreates a synthetic account when a previous random id would miss the allowlist. */
async function ensurePinnedE2EAccountId(authSub: string, pinnedId: string): Promise<void> {
  const existing = await applyflowPrisma.applyFlowAccount.findUnique({
    where: { authProviderSub: authSub },
    select: { id: true },
  });
  const occupant = await applyflowPrisma.applyFlowAccount.findUnique({
    where: { id: pinnedId },
    select: { authProviderSub: true },
  });
  if (existing && existing.id !== pinnedId) {
    await deleteAccountTree(existing.id);
  }
  if (occupant && occupant.authProviderSub !== authSub) {
    await deleteAccountTree(pinnedId);
  }
}
