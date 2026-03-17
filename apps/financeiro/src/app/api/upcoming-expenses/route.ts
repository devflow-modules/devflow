import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? "30")));
    const context = searchParams.get("context") as "PERSONAL" | "BUSINESS" | "SHARED" | null;

    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + daysAhead);

    const expenses = await prisma.expense.findMany({
      where: {
        householdId,
        status: { in: ["PENDING", "SCHEDULED"] },
        dueDate: { lte: to },
        ...(context && { context }),
      },
      orderBy: { dueDate: "asc" },
      include: { source: true, categoryRef: true },
    });

    const overdue = expenses.filter((e) => new Date(e.dueDate) < now);
    const upcoming = expenses.filter((e) => new Date(e.dueDate) >= now);

    const totalOverdue = overdue.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalUpcoming = upcoming.reduce((sum, e) => sum + Number(e.amount), 0);

    return sendSuccess({
      overdue,
      upcoming,
      totalOverdue,
      totalUpcoming,
      daysAhead,
    });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar próximas contas", 500, error);
  }
}
