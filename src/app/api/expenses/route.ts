import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { expenseCreateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {

    const expenses = await prisma.expense.findMany({
      where: { householdId },
      orderBy: { dueDate: "asc" },
      include: { source: true },
    });

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
  const { householdId } = auth.context;

  try {
    const payload = await request.json();

    const parseResult = expenseCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const hasPaidFields = parseResult.data.paidAt !== undefined || parseResult.data.paidAmount !== undefined;
    if (hasPaidFields && parseResult.data.status !== "PAID") {
      return sendError(
        "paidAt/paidAmount exigem status=PAID",
        400,
        { status: parseResult.data.status ?? null },
        "PAID_FIELDS_REQUIRE_PAID_STATUS"
      );
    }

    const expense = await prisma.expense.create({
      data: {
        ...parseResult.data,
        dueDate: dateInputToDate(parseResult.data.dueDate),
        ...(parseResult.data.paidAt ? { paidAt: dateInputToDate(parseResult.data.paidAt) } : {}),
        householdId,
      },
    });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.EXPENSE_CREATED,
      entityType: AUDIT_ENTITY.EXPENSE,
      entityId: expense.id,
      metadata: { category: expense.category, amount: expense.amount },
    });

    return sendSuccess(expense, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a despesa", 500, error);
  }
}
