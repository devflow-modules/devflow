import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { incomeCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listIncomes, createIncome } from "@/modules/financeiro/services/incomes";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") as "PERSONAL" | "BUSINESS" | "SHARED" | null;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const incomes = await listIncomes(prisma, householdId, {
      ...(context && { context }),
      ...(from && { from: new Date(from) }),
      ...(to && { to: new Date(to) }),
    });
    return sendSuccess(incomes);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as receitas", 500, error);
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
    const parseResult = incomeCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const income = await createIncome(prisma, householdId, parseResult.data, {
      userId,
      householdId,
    });

    return sendSuccess(income, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a receita", 500, error);
  }
}
