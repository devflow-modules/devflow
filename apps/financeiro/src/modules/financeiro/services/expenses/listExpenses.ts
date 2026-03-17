import type { PrismaClient, FinancialContext } from "@prisma/client";

export type ListExpensesOptions = {
  context?: FinancialContext;
  from?: Date;
  to?: Date;
  status?: "PENDING" | "PAID" | "SCHEDULED";
  isRecurring?: boolean;
};

export async function listExpenses(
  prisma: PrismaClient,
  householdId: string,
  options: ListExpensesOptions = {}
) {
  return prisma.expense.findMany({
    where: {
      householdId,
      ...(options.context && { context: options.context }),
      ...(options.status && { status: options.status }),
      ...(options.isRecurring !== undefined && { isRecurring: options.isRecurring }),
      ...(options.from || options.to
        ? {
            dueDate: {
              ...(options.from && { gte: options.from }),
              ...(options.to && { lte: options.to }),
            },
          }
        : {}),
    },
    orderBy: { dueDate: "asc" },
    include: { source: true, categoryRef: true },
  });
}
