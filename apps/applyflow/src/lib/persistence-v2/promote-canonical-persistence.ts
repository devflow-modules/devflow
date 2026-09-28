import type { ApplyFlowAccount, ApplyFlowCanonicalPersistence } from "@prisma/client";

/**
 * Trusted one-way domain primitive: v1_local → v2_cloud.
 *
 * Never accepts client-supplied canonicalPersistence.
 * Never downgrades. Concurrent callers: at most one effective promotion
 * via conditional updateMany on v1_local.
 */

export type CanonicalPromoteAccountDb = {
  applyFlowAccount: {
    findUnique(args: {
      where: { id: string };
      select?: { id?: boolean; canonicalPersistence?: boolean; pilotEligible?: boolean };
    }): Promise<Pick<ApplyFlowAccount, "id" | "canonicalPersistence" | "pilotEligible"> | null>;
    updateMany(args: {
      where: { id: string; canonicalPersistence: ApplyFlowCanonicalPersistence };
      data: { canonicalPersistence: ApplyFlowCanonicalPersistence };
    }): Promise<{ count: number }>;
  };
};

export type PromoteCanonicalResult =
  | { kind: "promoted"; canonicalPersistence: "v2_cloud" }
  | { kind: "already_v2"; canonicalPersistence: "v2_cloud" };

export class ApplyFlowCanonicalPromoteError extends Error {
  readonly code: "account_not_found" | "unexpected_canonical_state";

  constructor(code: ApplyFlowCanonicalPromoteError["code"]) {
    super(code);
    this.name = "ApplyFlowCanonicalPromoteError";
    this.code = code;
  }
}

/**
 * Promote account canonical persistence to v2_cloud.
 * Idempotent when already v2_cloud. Never writes v1_local.
 */
export async function promoteApplyFlowCanonicalPersistenceToV2(
  db: CanonicalPromoteAccountDb,
  accountId: string,
): Promise<PromoteCanonicalResult> {
  const updated = await db.applyFlowAccount.updateMany({
    where: { id: accountId, canonicalPersistence: "v1_local" },
    data: { canonicalPersistence: "v2_cloud" },
  });

  if (updated.count === 1) {
    return { kind: "promoted", canonicalPersistence: "v2_cloud" };
  }

  const account = await db.applyFlowAccount.findUnique({
    where: { id: accountId },
    select: { id: true, canonicalPersistence: true, pilotEligible: true },
  });

  if (!account) {
    throw new ApplyFlowCanonicalPromoteError("account_not_found");
  }

  if (account.canonicalPersistence === "v2_cloud") {
    return { kind: "already_v2", canonicalPersistence: "v2_cloud" };
  }

  // Should be unreachable with current enum; fail closed rather than invent a write.
  throw new ApplyFlowCanonicalPromoteError("unexpected_canonical_state");
}
