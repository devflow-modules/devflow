import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { personalAllocationGoalCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { getPersonalAllocationGoal } from "@/modules/financeiro/services/allocation-goals/getPersonalAllocationGoal";
import { upsertPersonalAllocationGoal } from "@/modules/financeiro/services/allocation-goals/upsertPersonalAllocationGoal";

function getYearMonthFromRequest(request: NextRequest) {
  const now = new Date();
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  return { year, month };
}

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { year, month } = getYearMonthFromRequest(request);
    const goal = await getPersonalAllocationGoal(
      prisma,
      auth.context.userId,
      auth.context.householdId,
      year,
      month
    );
    return sendSuccess(goal);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar sua meta pessoal", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const parseResult = personalAllocationGoalCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const goal = await upsertPersonalAllocationGoal(
      prisma,
      auth.context.userId,
      auth.context.householdId,
      parseResult.data
    );
    return sendSuccess(goal, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível salvar sua meta pessoal", 500, error);
  }
}
