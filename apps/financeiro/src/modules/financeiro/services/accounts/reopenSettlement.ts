import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { syncSettlementPaidFromLedger } from "./settlementLedger";

const TX_OPTS = {
  maxWait: 10_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export type ReopenSettlementResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "NOT_COMPLETED" };

export async function reopenSettlement(
  prisma: PrismaClient,
  settlementId: string,
  householdId: string
): Promise<ReopenSettlementResult> {
  const s = await prisma.settlement.findFirst({
    where: { id: settlementId, account: { householdId } },
    include: { account: { select: { householdId: true } } },
  });
  if (!s || s.account.householdId !== householdId) return { ok: false, code: "NOT_FOUND" };
  if (s.status !== "COMPLETED") return { ok: false, code: "NOT_COMPLETED" };

  await prisma.$transaction(async (tx) => {
    await tx.settlement.update({
      where: { id: settlementId },
      data: { reopenedAt: new Date(), completedAt: null },
    });
    await syncSettlementPaidFromLedger(tx, settlementId);
  }, TX_OPTS);
  return { ok: true };
}

export async function finalizeSettlementAfterReopen(
  prisma: PrismaClient,
  settlementId: string,
  householdId: string
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "NOT_REOPENED" }> {
  const s = await prisma.settlement.findFirst({
    where: { id: settlementId, account: { householdId } },
    include: { account: { select: { householdId: true } } },
  });
  if (!s || s.account.householdId !== householdId) return { ok: false, code: "NOT_FOUND" };
  if (!s.reopenedAt) return { ok: false, code: "NOT_REOPENED" };

  await prisma.$transaction(async (tx) => {
    await tx.settlement.update({
      where: { id: settlementId },
      data: { reopenedAt: null },
    });
    await syncSettlementPaidFromLedger(tx, settlementId);
  }, TX_OPTS);
  return { ok: true };
}
