import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { expenseCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listExpenses, createExpense } from "@/modules/financeiro/services/expenses";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const expenses = await listExpenses(prisma, householdId);
    return sendSuccess(expenses);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as despesas", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const payload = await request.json();
    const parseResult = expenseCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const hasPaidFields =
      parseResult.data.paidAt !== undefined || parseResult.data.paidAmount !== undefined;
    if (hasPaidFields && parseResult.data.status !== "PAID") {
      return sendError(
        "paidAt/paidAmount exigem status=PAID",
        400,
        { status: parseResult.data.status ?? null },
        "PAID_FIELDS_REQUIRE_PAID_STATUS"
      );
    }

    const expense = await createExpense(prisma, householdId, parseResult.data, {
      userId,
      householdId,
    });

    return sendSuccess(expense, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a despesa", 500, error);
  }
}
