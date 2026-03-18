import type { PrismaClient } from "@prisma/client";
import { roundMoney } from "@/modules/financeiro/utils/money";

/**
 * Para cada participante da conta: quanto cada um pagou (positivo) vs quanto deve (splits).
 * Saldo = o que pagou - o que deve. Quem pagou mais fica positivo (outros lhe devem).
 */
export async function calculateBalances(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<Record<string, number>> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: {
      participants: true,
      expenses: {
        where: { status: "PAID" },
        include: {
          splits: true,
          paidByParticipant: true,
        },
      },
    },
  });
  if (!account) return {};

  const balances: Record<string, number> = {};
  for (const p of account.participants) {
    balances[p.id] = 0;
  }

  for (const exp of account.expenses) {
    const amount = roundMoney(Number(exp.paidAmount ?? exp.amount));
    if (exp.paidByParticipantId && exp.expenseSplitType === "INDIVIDUAL") {
      balances[exp.paidByParticipantId] = roundMoney((balances[exp.paidByParticipantId] ?? 0) + amount);
      // Quem pagou individual: não desconta split (já é 100% dele)
      continue;
    }
    for (const split of exp.splits) {
      const amt = roundMoney(Number(split.amount));
      balances[split.participantId] = roundMoney((balances[split.participantId] ?? 0) - amt);
    }
    if (exp.paidByParticipantId) {
      balances[exp.paidByParticipantId] = roundMoney((balances[exp.paidByParticipantId] ?? 0) + amount);
    }
  }

  const byName: Record<string, number> = {};
  for (const p of account.participants) {
    byName[p.name] = roundMoney(balances[p.id] ?? 0);
  }
  return byName;
}
