import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { expenseUpdateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { dateInputToDate } from "@/lib/dates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { expenseId } = await params;
    const payload = await request.json();

    const parseResult = expenseUpdateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const hasPaidFields =
      parseResult.data.paidAt !== undefined ||
      parseResult.data.paidAmount !== undefined;
    if (hasPaidFields && parseResult.data.status !== "PAID") {
      return sendError(
        "paidAt/paidAmount exigem status=PAID",
        400,
        { status: parseResult.data.status ?? null },
        "PAID_FIELDS_REQUIRE_PAID_STATUS"
      );
    }

    const data: Record<string, unknown> = {
      ...parseResult.data,
      ...(parseResult.data.dueDate
        ? { dueDate: dateInputToDate(parseResult.data.dueDate) }
        : {}),
      ...(parseResult.data.paidAt
        ? { paidAt: dateInputToDate(parseResult.data.paidAt) }
        : {}),
    };

    if (parseResult.data.status && parseResult.data.status !== "PAID") {
      data.paidAt = null;
      data.paidAmount = null;
    }

    const result = await prisma.expense.updateMany({
      where: { id: expenseId, householdId },
      data,
    });

    if (result.count === 0) {
      return sendError("Despesa não encontrada", 404);
    }

    const updated = await prisma.expense.findUnique({ where: { id: expenseId } });

    if (updated) {
      await createAuditLog(prisma, {
        userId: auth.context.userId,
        householdId,
        action: AUDIT_ACTIONS.EXPENSE_UPDATED,
        entityType: AUDIT_ENTITY.EXPENSE,
        entityId: updated.id,
        metadata: { category: updated.category, amount: updated.amount },
      });
    }

    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a despesa", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { expenseId } = await params;

    const deleted = await prisma.expense.deleteMany({
      where: { id: expenseId, householdId },
    });

    if (deleted.count === 0) {
      return sendError("Despesa não encontrada", 404);
    }

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.EXPENSE_DELETED,
      entityType: AUDIT_ENTITY.EXPENSE,
      entityId: expenseId,
    });

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a despesa", 500, error);
  }
}
