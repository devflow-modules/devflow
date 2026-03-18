import type { PrismaClient } from "@prisma/client";

export type MonthlySummaryItem = {
  participantName: string;
  totalOwed: number;
  totalPaid: number;
  balance: number;
};

export async function calculateMonthlySummary(
  prisma: PrismaClient,
  accountId: string,
  householdId: string,
  year: number,
  month: number
): Promise<{ totalExpenses: number; byParticipant: MonthlySummaryItem[] } | null> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: {
      participants: true,
      expenses: {
        where: {
          status: "PAID",
          dueDate: { gte: start, lte: end },
        },
        include: { splits: true, paidByParticipant: true },
      },
    },
  });
  if (!account) return null;

  let totalExpenses = 0;
  const paidByParticipant: Record<string, number> = {};
  const owedByParticipant: Record<string, number> = {};
  for (const p of account.participants) {
    paidByParticipant[p.id] = 0;
    owedByParticipant[p.id] = 0;
  }

  for (const exp of account.expenses) {
    const amount = Number(exp.paidAmount ?? exp.amount);
    totalExpenses += amount;
    if (exp.paidByParticipantId) {
      paidByParticipant[exp.paidByParticipantId] =
        (paidByParticipant[exp.paidByParticipantId] ?? 0) + amount;
    }
    for (const split of exp.splits) {
      const amt = Number(split.amount);
      owedByParticipant[split.participantId] =
        (owedByParticipant[split.participantId] ?? 0) + amt;
    }
  }

  const byParticipant: MonthlySummaryItem[] = account.participants.map((p) => {
    const paid = paidByParticipant[p.id] ?? 0;
    const owed = owedByParticipant[p.id] ?? 0;
    return {
      participantName: p.name,
      totalOwed: Math.round(owed * 100) / 100,
      totalPaid: Math.round(paid * 100) / 100,
      balance: Math.round((paid - owed) * 100) / 100,
    };
  });

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    byParticipant,
  };
}
