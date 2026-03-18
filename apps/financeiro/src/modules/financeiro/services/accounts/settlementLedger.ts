import type { PrismaClient, SettlementStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { MONEY_EPS, roundMoney } from "@/modules/financeiro/utils/money";

/** Cliente mínimo para ledger (PrismaClient ou TransactionClient). */
export type LedgerDb = Pick<PrismaClient, "payment" | "settlement">;

/**
 * Saldo líquido pago no settlement = soma(pagamentos) − soma(estornos).
 */
export async function computeNetPaidForSettlement(
  db: LedgerDb,
  settlementId: string
): Promise<number> {
  const payments = await db.payment.findMany({
    where: { settlementId },
    include: { reversals: true },
  });
  let net = 0;
  for (const p of payments) {
    const gross = roundMoney(Number(p.amount));
    const rev = p.reversals.reduce((s, r) => s + roundMoney(Number(r.amount)), 0);
    net += roundMoney(gross - rev);
  }
  return Math.max(0, roundMoney(net));
}

export async function syncSettlementPaidFromLedger(
  db: LedgerDb,
  settlementId: string
): Promise<void> {
  const settlement = await db.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) return;
  const net = await computeNetPaidForSettlement(db, settlementId);
  const total = roundMoney(Number(settlement.amount));
  let status: SettlementStatus;
  let completedAt: Date | null = null;
  let reopenedAt: Date | null = settlement.reopenedAt;

  if (net <= MONEY_EPS) {
    status = "PENDING";
    reopenedAt = null;
  } else if (net >= total - MONEY_EPS) {
    if (reopenedAt) {
      status = "PARTIAL";
      completedAt = null;
    } else {
      status = "COMPLETED";
      completedAt = settlement.completedAt ?? new Date();
    }
  } else {
    status = "PARTIAL";
    completedAt = null;
    reopenedAt = null;
  }

  await db.settlement.update({
    where: { id: settlementId },
    data: {
      paidAmount: new Decimal(net),
      status,
      completedAt,
      reopenedAt,
    },
  });
}
