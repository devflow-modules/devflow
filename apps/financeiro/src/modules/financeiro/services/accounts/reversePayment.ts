import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { MONEY_EPS, roundMoney } from "@/modules/financeiro/utils/money";
import { syncSettlementPaidFromLedger } from "./settlementLedger";

const TX_OPTS = {
  maxWait: 10_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export type ReversePaymentResult =
  | { ok: true; reversalId: string; reversedAmount: number; settlementId: string }
  | { ok: false; code: "NOT_FOUND" | "NOTHING_TO_REVERSE" | "EXCEEDS_REFUNDABLE" | "INVALID_AMOUNT" };

export async function reversePayment(
  prisma: PrismaClient,
  paymentId: string,
  householdId: string,
  amount?: number
): Promise<ReversePaymentResult> {
  const p = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      settlement: { account: { householdId } },
    },
    include: {
      reversals: true,
      settlement: { include: { account: { select: { householdId: true, id: true } } } },
    },
  });
  if (!p || p.settlement.account.householdId !== householdId) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const gross = roundMoney(Number(p.amount));
  const already = p.reversals.reduce((s, r) => s + roundMoney(Number(r.amount)), 0);
  const refundable = roundMoney(gross - already);
  if (refundable <= MONEY_EPS) {
    return { ok: false, code: "NOTHING_TO_REVERSE" };
  }
  const requested = amount !== undefined ? roundMoney(amount) : refundable;
  if (requested <= 0) return { ok: false, code: "INVALID_AMOUNT" };
  if (requested > refundable + MONEY_EPS) {
    return { ok: false, code: "EXCEEDS_REFUNDABLE" };
  }

  try {
    const out = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment.findFirst({
        where: { id: paymentId, settlement: { account: { householdId } } },
        include: { reversals: true },
      });
      if (!pay) throw new Error("NOT_FOUND");
      const ref = pay.reversals.reduce((s, r) => s + roundMoney(Number(r.amount)), 0);
      const refLeft = roundMoney(roundMoney(Number(pay.amount)) - ref);
      const req = amount !== undefined ? roundMoney(amount) : refLeft;
      if (req <= MONEY_EPS || req > refLeft + MONEY_EPS) throw new Error("EXCEEDS");
      const rev = await tx.paymentReversal.create({
        data: { paymentId, amount: new Decimal(req) },
      });
      await syncSettlementPaidFromLedger(tx, pay.settlementId);
      return { reversalId: rev.id, reversedAmount: req, settlementId: pay.settlementId };
    }, TX_OPTS);
    return { ok: true, ...out };
  } catch {
    return { ok: false, code: "EXCEEDS_REFUNDABLE" };
  }
}
