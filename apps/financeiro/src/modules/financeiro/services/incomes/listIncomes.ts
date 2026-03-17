import type { PrismaClient, FinancialContext } from "@prisma/client";

export type ListIncomesOptions = {
  context?: FinancialContext;
  from?: Date;
  to?: Date;
  status?: "SCHEDULED" | "RECEIVED";
  isRecurring?: boolean;
};

export async function listIncomes(
  prisma: PrismaClient,
  householdId: string,
  options: ListIncomesOptions = {}
) {
  return prisma.income.findMany({
    where: {
      householdId,
      ...(options.context && { context: options.context }),
      ...(options.status && { status: options.status }),
      ...(options.isRecurring !== undefined && { isRecurring: options.isRecurring }),
      ...(options.from || options.to
        ? {
            receivedAt: {
              ...(options.from && { gte: options.from }),
              ...(options.to && { lte: options.to }),
            },
          }
        : {}),
    },
    orderBy: { receivedAt: "desc" },
    include: { source: true },
  });
}
