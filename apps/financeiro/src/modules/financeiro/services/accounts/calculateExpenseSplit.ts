import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { roundMoney } from "@/modules/financeiro/utils/money";

/**
 * Calcula a divisão de uma despesa e persiste em ExpenseSplit.
 * - SHARED: divide pelo defaultShare dos participantes (soma deve ser 1).
 * - INDIVIDUAL: 100% para paidByParticipantId.
 */
export async function calculateAndPersistExpenseSplit(
  prisma: PrismaClient,
  expenseId: string
): Promise<{ participantId: string; amount: number }[] | null> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      account: { include: { participants: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!expense?.accountId || !expense.account) return null;

  const amount = Number(expense.amount);
  const participants = expense.account.participants;
  if (participants.length === 0) return null;

  let splits: { participantId: string; amount: number }[];

  if (expense.expenseSplitType === "INDIVIDUAL" && expense.paidByParticipantId) {
    const paidBy = participants.find((p) => p.id === expense.paidByParticipantId);
    if (!paidBy) return null;
    splits = [{ participantId: paidBy.id, amount }];
  } else {
    const totalShare = participants.reduce(
      (sum, p) => sum + Number(p.defaultShare),
      0
    );
    if (totalShare <= 0) return null;
    const n = participants.length;
    let acc = 0;
    splits = participants.map((p, i) => {
      if (i === n - 1) {
        return { participantId: p.id, amount: roundMoney(amount - acc) };
      }
      const part = roundMoney((amount * Number(p.defaultShare)) / totalShare);
      acc += part;
      return { participantId: p.id, amount: part };
    });
  }

  await prisma.expenseSplit.deleteMany({ where: { expenseId } });
  await prisma.expenseSplit.createMany({
    data: splits.map((s) => ({
      expenseId,
      participantId: s.participantId,
      amount: new Decimal(s.amount),
    })),
  });

  return splits;
}
