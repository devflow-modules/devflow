import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";

type AllocationResponse = {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  allocations: { sourceId: string; amount: number; share: number }[];
};

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const [rules, expenses] = await Promise.all([
      prisma.rule.findMany({
        where: { householdId },
        include: {
          ruleSources: { include: { source: true } },
        },
      }),
      prisma.expense.findMany({ where: { householdId }, include: { source: true } }),
    ]);

    type RuleItem = {
      id: string;
      ruleType: string;
      referenceCategory: string | null;
      fixedAmount: unknown;
      percentage: unknown;
      name: string;
      ruleSources: { sourceId: string; share: unknown; percentage?: unknown }[];
    };
    type ExpenseItem = { category: string; amount: unknown };

    const allocations = rules.map<AllocationResponse>((rule: RuleItem) => {
      const baseAmount = (() => {
        if (rule.ruleType === "CATEGORY_PERCENTAGE" && rule.referenceCategory) {
          return (expenses as ExpenseItem[])
            .filter((expense: ExpenseItem) => expense.category === rule.referenceCategory)
            .reduce((total: number, expense: ExpenseItem) => total + Number(expense.amount ?? 0), 0);
        }

        if (rule.ruleType === "FIXED_PER_MEMBER" && rule.fixedAmount) {
          return Number(rule.fixedAmount);
        }

        return 0;
      })();

      const shareDenominator = rule.ruleSources.reduce(
        (sum: number, ruleSource: { share: unknown }) => {
          const shareValue = Number(ruleSource.share ?? rule.percentage ?? 0);
          return sum + (shareValue || 0);
        },
        0
      );

      const memberCount = rule.ruleSources.length || 1;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        allocations: rule.ruleSources.map((ruleSource: { sourceId: string; share: unknown }) => {
          const shareValue = Number(ruleSource.share ?? rule.percentage ?? 0);
          const normalizedShare =
            shareDenominator > 0 ? shareValue / shareDenominator : 1 / memberCount;
          const amount = baseAmount * normalizedShare;

          return {
            sourceId: ruleSource.sourceId,
            amount,
            share: normalizedShare,
          };
        }),
      };
    });

    return sendSuccess({ allocations });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível calcular o rateio", 500, error);
  }
}
