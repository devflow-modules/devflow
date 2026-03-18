import type { PrismaClient } from "@prisma/client";
import { roundMoney } from "@/modules/financeiro/utils/money";
import { calculateBalances } from "./calculateBalances";

/**
 * Saldo efetivo = saldo das despesas - liquidações já realizadas.
 * Usado para exibir "quem deve para quem" e para gerar novos settlements.
 */
export async function getEffectiveBalances(
  prisma: PrismaClient,
  accountId: string,
  householdId: string
): Promise<Record<string, number>> {
  const raw = await calculateBalances(prisma, accountId, householdId);

  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
    include: {
      participants: true,
      settlements: {
        where: { status: { in: ["PARTIAL", "COMPLETED"] } },
        select: { fromParticipantId: true, toParticipantId: true, paidAmount: true },
      },
    },
  });
  if (!account) return raw;

  const byId: Record<string, number> = {};
  for (const p of account.participants) {
    byId[p.id] = raw[p.name] ?? 0;
  }
  for (const s of account.settlements) {
    const amt = roundMoney(Number(s.paidAmount));
    byId[s.fromParticipantId] = roundMoney((byId[s.fromParticipantId] ?? 0) + amt);
    byId[s.toParticipantId] = roundMoney((byId[s.toParticipantId] ?? 0) - amt);
  }

  const byName: Record<string, number> = {};
  for (const p of account.participants) {
    byName[p.name] = roundMoney(byId[p.id] ?? 0);
  }
  return byName;
}
