import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getEffectiveBalances } from "./getEffectiveBalances";
import { roundMoney } from "@/modules/financeiro/utils/money";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const TX_OPTS = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

export type CloseMonthResult =
  | { ok: true; month: string; balances: Record<string, number> }
  | { ok: false; code: "INVALID_MONTH" | "NOT_FOUND" };

export async function closeAccountMonth(
  prisma: PrismaClient,
  accountId: string,
  householdId: string,
  month: string
): Promise<CloseMonthResult> {
  if (!MONTH_RE.test(month)) return { ok: false, code: "INVALID_MONTH" };

  const raw = await getEffectiveBalances(prisma, accountId, householdId);
  const balances: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    balances[k] = roundMoney(v);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, householdId },
        select: { id: true },
      });
      if (!account) throw new Error("NOT_FOUND");

      await tx.accountSnapshot.upsert({
        where: { accountId_month: { accountId, month } },
        create: {
          accountId,
          month,
          balances: balances as Prisma.InputJsonValue,
        },
        update: {
          balances: balances as Prisma.InputJsonValue,
          createdAt: new Date(),
        },
      });
    }, TX_OPTS);
  } catch {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, month, balances };
}
