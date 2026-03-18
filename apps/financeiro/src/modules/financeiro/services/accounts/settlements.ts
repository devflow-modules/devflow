import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { MONEY_EPS, roundMoney } from "@/modules/financeiro/utils/money";
import { getEffectiveBalances } from "./getEffectiveBalances";
import { simplifyDebts } from "./simplifyDebts";
import {
  computeNetPaidForSettlement,
  syncSettlementPaidFromLedger,
} from "./settlementLedger";

const TX_OPTS = {
  maxWait: 10_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export type SettlementWithNames = {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  fromName: string;
  toName: string;
  amount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED";
  completedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
};

export type PaymentWithSettlement = {
  id: string;
  settlementId: string;
  amount: number;
  reversedTotal: number;
  netAmount: number;
  createdAt: string;
  fromName: string;
  toName: string;
  fromParticipantId: string;
  toParticipantId: string;
};

export type ApplyPaymentResult =
  | { ok: true; settlement: SettlementWithNames }
  | { ok: false; code: "NOT_FOUND" | "INVALID_AMOUNT" | "EXCEEDS_REMAINING" };

export async function listSettlements(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<SettlementWithNames[]> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    select: { id: true },
  });
  if (!account) return [];

  const list = await prisma.settlement.findMany({
    where: {
      accountId,
      account: { householdId },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      fromParticipant: { select: { name: true } },
      toParticipant: { select: { name: true } },
    },
  });

  return list.map((s) => ({
    id: s.id,
    fromParticipantId: s.fromParticipantId,
    toParticipantId: s.toParticipantId,
    fromName: s.fromParticipant.name,
    toName: s.toParticipant.name,
    amount: roundMoney(Number(s.amount)),
    paidAmount: roundMoney(Number(s.paidAmount ?? 0)),
    status: s.status as "PENDING" | "PARTIAL" | "COMPLETED",
    completedAt: s.completedAt?.toISOString() ?? null,
    reopenedAt: s.reopenedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function createSettlementsFromBalances(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<SettlementWithNames[]> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: { participants: true },
  });
  if (!account) return [];

  const effective = await getEffectiveBalances(prisma, accountId, householdId);
  const transfers = simplifyDebts(effective);
  if (transfers.length === 0) return listSettlements(prisma, accountId, householdId);

  const nameToId = new Map(account.participants.map((p) => [p.name, p.id]));

  const existingOpen = await prisma.settlement.findMany({
    where: { accountId, account: { householdId }, status: { in: ["PENDING", "PARTIAL"] } },
    select: { fromParticipantId: true, toParticipantId: true },
  });
  const openPairs = new Set(existingOpen.map((s) => `${s.fromParticipantId}:${s.toParticipantId}`));

  await prisma.$transaction(
    async (tx) => {
      await tx.settlement.deleteMany({
        where: { accountId, account: { householdId }, status: "PENDING" },
      });

      for (const t of transfers) {
        const fromId = nameToId.get(t.from);
        const toId = nameToId.get(t.to);
        const amt = roundMoney(t.amount);
        if (!fromId || !toId || amt <= 0) continue;
        if (openPairs.has(`${fromId}:${toId}`)) continue;

        await tx.settlement.create({
          data: {
            accountId,
            fromParticipantId: fromId,
            toParticipantId: toId,
            amount: new Decimal(amt),
            paidAmount: new Decimal(0),
            status: "PENDING",
          },
        });
      }
    },
    { maxWait: 15_000, timeout: 30_000 }
  );

  return listSettlements(prisma, accountId, householdId);
}

export async function applyPayment(
  prisma: PrismaClient,
  settlementId: string,
  amount: number,
  householdId: string
): Promise<ApplyPaymentResult> {
  const pay = roundMoney(amount);
  if (pay <= 0) return { ok: false, code: "INVALID_AMOUNT" };

  const pre = await prisma.settlement.findFirst({
    where: { id: settlementId, account: { householdId } },
    include: { account: { select: { householdId: true, id: true } } },
  });
  if (!pre || pre.account.householdId !== householdId) return { ok: false, code: "NOT_FOUND" };

  try {
    await prisma.$transaction(async (tx) => {
      const s = await tx.settlement.findFirst({
        where: { id: settlementId, account: { householdId } },
      });
      if (!s) throw new Error("NOT_FOUND");
      const total = roundMoney(Number(s.amount));
      const net = await computeNetPaidForSettlement(tx, settlementId);
      const remaining = roundMoney(total - net);
      if (pay > remaining + MONEY_EPS || remaining <= MONEY_EPS) {
        throw new Error("EXCEEDS_REMAINING");
      }
      const toApply = roundMoney(Math.min(pay, remaining));
      await tx.payment.create({
        data: { settlementId, amount: new Decimal(toApply) },
      });
      await syncSettlementPaidFromLedger(tx, settlementId);
    }, TX_OPTS);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "EXCEEDS_REMAINING") return { ok: false, code: "EXCEEDS_REMAINING" };
    if (msg === "NOT_FOUND") return { ok: false, code: "NOT_FOUND" };
    throw e;
  }

  const list = await listSettlements(prisma, pre.accountId, householdId);
  const settlement = list.find((x) => x.id === settlementId);
  if (!settlement) return { ok: false, code: "NOT_FOUND" };
  return { ok: true, settlement };
}

export async function completeSettlement(
  prisma: PrismaClient,
  settlementId: string,
  householdId: string
): Promise<SettlementWithNames | null> {
  const s = await prisma.settlement.findFirst({
    where: { id: settlementId, account: { householdId } },
    include: { account: { select: { householdId: true } } },
  });
  if (!s || s.account.householdId !== householdId) return null;
  if (s.status === "COMPLETED" && !s.reopenedAt) return null;

  const total = roundMoney(Number(s.amount));
  const net = await computeNetPaidForSettlement(prisma, settlementId);
  const remaining = roundMoney(total - net);
  if (remaining <= MONEY_EPS) {
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: settlementId },
        data: { reopenedAt: null },
      });
      await syncSettlementPaidFromLedger(tx, settlementId);
    }, TX_OPTS);
    return listSettlements(prisma, s.accountId, householdId).then((l) => l.find((x) => x.id === settlementId) ?? null);
  }
  const r = await applyPayment(prisma, settlementId, remaining, householdId);
  return r.ok ? r.settlement : null;
}

export async function createManualSettlement(
  prisma: PrismaClient,
  accountId: string,
  householdId: string,
  data: { fromParticipantId: string; toParticipantId: string; amount: number }
): Promise<SettlementWithNames | null> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: { participants: true },
  });
  if (!account || data.amount <= 0) return null;
  const from = account.participants.find((p) => p.id === data.fromParticipantId);
  const to = account.participants.find((p) => p.id === data.toParticipantId);
  if (!from || !to || from.id === to.id) return null;

  const amount = roundMoney(data.amount);
  const openDup = await prisma.settlement.findFirst({
    where: {
      accountId,
      account: { householdId },
      fromParticipantId: data.fromParticipantId,
      toParticipantId: data.toParticipantId,
      status: { in: ["PENDING", "PARTIAL"] },
    },
  });
  if (openDup) return null;

  const newId = await prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        accountId,
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        amount: new Decimal(amount),
        paidAmount: new Decimal(amount),
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    await tx.payment.create({
      data: { settlementId: settlement.id, amount: new Decimal(amount) },
    });
    await syncSettlementPaidFromLedger(tx, settlement.id);
    return settlement.id;
  }, TX_OPTS);

  const list = await listSettlements(prisma, accountId, householdId);
  return list.find((x) => x.id === newId) ?? null;
}

export async function listPayments(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<PaymentWithSettlement[]> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    select: { id: true },
  });
  if (!account) return [];

  const payments = await prisma.payment.findMany({
    where: {
      settlement: {
        accountId,
        account: { householdId },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      reversals: true,
      settlement: {
        include: {
          fromParticipant: { select: { name: true } },
          toParticipant: { select: { name: true } },
        },
      },
    },
  });

  return payments.map((p) => {
    const gross = roundMoney(Number(p.amount));
    const reversedTotal = p.reversals.reduce((s, r) => s + roundMoney(Number(r.amount)), 0);
    return {
      id: p.id,
      settlementId: p.settlementId,
      amount: gross,
      reversedTotal: roundMoney(reversedTotal),
      netAmount: roundMoney(gross - reversedTotal),
      createdAt: p.createdAt.toISOString(),
      fromName: p.settlement.fromParticipant.name,
      toName: p.settlement.toParticipant.name,
      fromParticipantId: p.settlement.fromParticipantId,
      toParticipantId: p.settlement.toParticipantId,
    };
  });
}

export async function getSuggestedTransfers(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<{ from: string; to: string; amount: number }[]> {
  const effective = await getEffectiveBalances(prisma, accountId, householdId);
  return simplifyDebts(effective);
}
