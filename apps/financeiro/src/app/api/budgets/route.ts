import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { budgetCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listBudgets, createBudget } from "@/modules/financeiro/services/budgets";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  try {
    const budgets = await listBudgets(prisma, auth.context.householdId);
    return sendSuccess(budgets);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os orçamentos", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  try {
    const payload = await request.json();
    const parsed = budgetCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const budget = await createBudget(prisma, auth.context.householdId, parsed.data);
    return sendSuccess(budget, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o orçamento", 500, error);
  }
}
