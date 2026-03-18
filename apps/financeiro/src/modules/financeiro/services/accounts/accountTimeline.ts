import type { PrismaClient } from "@prisma/client";
import { roundMoney } from "@/modules/financeiro/utils/money";

export type TimelineEvent =
  | {
      type: "expense_created";
      at: string;
      id: string;
      label: string;
      amount: number;
    }
  | {
      type: "settlement_created";
      at: string;
      id: string;
      fromName: string;
      toName: string;
      amount: number;
    }
  | {
      type: "payment_made";
      at: string;
      id: string;
      settlementId: string;
      fromName: string;
      toName: string;
      amount: number;
    }
  | {
      type: "payment_reversed";
      at: string;
      id: string;
      paymentId: string;
      fromName: string;
      toName: string;
      amount: number;
    }
  | {
      type: "settlement_completed";
      at: string;
      id: string;
      fromName: string;
      toName: string;
      amount: number;
    };

export async function getAccountTimeline(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<TimelineEvent[]> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    select: { id: true },
  });
  if (!account) return [];

  const [expenses, settlements, payments, reversals] = await Promise.all([
    prisma.expense.findMany({
      where: { accountId, householdId },
      orderBy: { dueDate: "asc" },
      select: { id: true, category: true, amount: true, dueDate: true },
    }),
    prisma.settlement.findMany({
      where: { accountId, account: { householdId } },
      orderBy: { createdAt: "asc" },
      include: {
        fromParticipant: { select: { name: true } },
        toParticipant: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { settlement: { accountId } },
      orderBy: { createdAt: "asc" },
      include: {
        settlement: {
          include: {
            fromParticipant: { select: { name: true } },
            toParticipant: { select: { name: true } },
          },
        },
      },
    }),
    prisma.paymentReversal.findMany({
      where: { payment: { settlement: { accountId, account: { householdId } } } },
      orderBy: { createdAt: "asc" },
      include: {
        payment: {
          include: {
            settlement: {
              include: {
                fromParticipant: { select: { name: true } },
                toParticipant: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const e of expenses) {
    events.push({
      type: "expense_created",
      at: e.dueDate.toISOString(),
      id: e.id,
      label: e.category,
      amount: roundMoney(Number(e.amount)),
    });
  }

  for (const s of settlements) {
    events.push({
      type: "settlement_created",
      at: s.createdAt.toISOString(),
      id: s.id,
      fromName: s.fromParticipant.name,
      toName: s.toParticipant.name,
      amount: roundMoney(Number(s.amount)),
    });
    if (s.completedAt && s.status === "COMPLETED") {
      events.push({
        type: "settlement_completed",
        at: s.completedAt.toISOString(),
        id: `${s.id}-completed`,
        fromName: s.fromParticipant.name,
        toName: s.toParticipant.name,
        amount: roundMoney(Number(s.paidAmount)),
      });
    }
  }

  for (const p of payments) {
    const st = p.settlement;
    events.push({
      type: "payment_made",
      at: p.createdAt.toISOString(),
      id: p.id,
      settlementId: p.settlementId,
      fromName: st.fromParticipant.name,
      toName: st.toParticipant.name,
      amount: roundMoney(Number(p.amount)),
    });
  }

  for (const r of reversals) {
    const st = r.payment.settlement;
    events.push({
      type: "payment_reversed",
      at: r.createdAt.toISOString(),
      id: r.id,
      paymentId: r.paymentId,
      fromName: st.fromParticipant.name,
      toName: st.toParticipant.name,
      amount: roundMoney(Number(r.amount)),
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return events;
}
