import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { incomeCreateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {

    const incomes = await prisma.income.findMany({
      where: { householdId },
      orderBy: { receivedAt: "desc" },
      include: { source: true },
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
  const { householdId } = auth.context;

  try {
    const payload = await request.json();

    const parseResult = incomeCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const { sourceId, ...rest } = parseResult.data;
    const income = await prisma.income.create({
      data: {
        ...rest,
        receivedAt: dateInputToDate(rest.receivedAt),
        householdId,
        ...(sourceId ? { sourceId } : {}),
      },
    });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.INCOME_CREATED,
      entityType: AUDIT_ENTITY.INCOME,
      entityId: income.id,
      metadata: { amount: income.amount, receivedAt: income.receivedAt },
    });

    return sendSuccess(income, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a receita", 500, error);
  }
}
