import type { PrismaClient } from "@prisma/client";
import {
  DEMO_ACCOUNT_NAMES,
  DEMO_CATEGORY_MARKER,
  DEMO_GOAL_OBSERVATIONS_TAG,
  DEMO_INCOME_NOTES_TAG,
  DEMO_RULE_NAME_PREFIX,
  DEMO_SOURCE_NAMES,
} from "./constants";
import { logFinanceiroDemo } from "./helpers";

async function deleteAccountsAndDependents(prisma: PrismaClient, accountIds: string[]): Promise<void> {
  if (!accountIds.length) return;

  const settlements = await prisma.settlement.findMany({
    where: { accountId: { in: accountIds } },
    select: { id: true },
  });
  const settlementIds = settlements.map((s) => s.id);
  if (settlementIds.length) {
    const payments = await prisma.payment.findMany({
      where: { settlementId: { in: settlementIds } },
      select: { id: true },
    });
    const paymentIds = payments.map((p) => p.id);
    if (paymentIds.length) {
      await prisma.paymentReversal.deleteMany({ where: { paymentId: { in: paymentIds } } });
      await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    }
    await prisma.settlement.deleteMany({ where: { id: { in: settlementIds } } });
  }

  await prisma.expense.deleteMany({ where: { accountId: { in: accountIds } } });
  await prisma.accountSnapshot.deleteMany({ where: { accountId: { in: accountIds } } });
  await prisma.accountParticipant.deleteMany({ where: { accountId: { in: accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
}

/**
 * Remove apenas artefatos marcados como demo deste household.
 * Não apaga MonthSnapshot genérico nem outros dados do usuário fora dos nomes demo.
 */
export async function resetFinanceiroDemoData(prisma: PrismaClient, householdId: string): Promise<void> {
  logFinanceiroDemo("reset_start", { householdId });

  const demoAccs = await prisma.account.findMany({
    where: { householdId, name: { in: [...DEMO_ACCOUNT_NAMES] } },
    select: { id: true },
  });
  const accountIds = demoAccs.map((a) => a.id);
  await deleteAccountsAndDependents(prisma, accountIds);

  const demoRules = await prisma.rule.findMany({
    where: { householdId, name: { startsWith: DEMO_RULE_NAME_PREFIX } },
    select: { id: true },
  });
  const ruleIds = demoRules.map((r) => r.id);
  if (ruleIds.length) {
    await prisma.ruleSource.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.rule.deleteMany({ where: { id: { in: ruleIds } } });
  }

  const demoSources = await prisma.source.findMany({
    where: { householdId, name: { in: [...DEMO_SOURCE_NAMES] } },
    select: { id: true },
  });
  const sourceIds = demoSources.map((s) => s.id);

  await prisma.income.deleteMany({
    where: {
      householdId,
      OR: [
        { notes: { contains: DEMO_INCOME_NOTES_TAG } },
        ...(sourceIds.length ? [{ sourceId: { in: sourceIds } }] : []),
      ],
    },
  });

  await prisma.incomeAllocationGoal.deleteMany({
    where: { householdId, observations: { contains: DEMO_GOAL_OBSERVATIONS_TAG } },
  });

  const demoCategories = await prisma.category.findMany({
    where: { householdId, name: { endsWith: DEMO_CATEGORY_MARKER } },
    select: { id: true },
  });
  const categoryIds = demoCategories.map((c) => c.id);
  if (categoryIds.length) {
    await prisma.budget.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  }

  if (sourceIds.length) {
    await prisma.source.deleteMany({ where: { id: { in: sourceIds } } });
  }

  logFinanceiroDemo("reset_done", { householdId, removedAccounts: accountIds.length, removedSources: sourceIds.length });
}
