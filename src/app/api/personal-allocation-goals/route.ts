import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { personalAllocationGoalCreateSchema } from "@/lib/financeiro/schema";

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
    const goal = await prisma.personalAllocationGoal.findUnique({
      where: {
        userId_householdId_year_month: {
          userId: auth.context.userId,
          householdId: auth.context.householdId,
          year,
          month,
        },
      },
    });
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

    const data = parseResult.data;

    const goal = await prisma.personalAllocationGoal.upsert({
      where: {
        userId_householdId_year_month: {
          userId: auth.context.userId,
          householdId: auth.context.householdId,
          year: data.year,
          month: data.month,
        },
      },
      create: {
        userId: auth.context.userId,
        householdId: auth.context.householdId,
        year: data.year,
        month: data.month,
        investmentPercent: data.investmentPercent,
        savingsPercent: data.savingsPercent,
        investmentAmount: data.investmentAmount,
        savingsAmount: data.savingsAmount,
        observations: data.observations,
      },
      update: {
        investmentPercent: data.investmentPercent,
        savingsPercent: data.savingsPercent,
        investmentAmount: data.investmentAmount,
        savingsAmount: data.savingsAmount,
        observations: data.observations,
      },
    });

    return sendSuccess(goal, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível salvar sua meta pessoal", 500, error);
  }
}
