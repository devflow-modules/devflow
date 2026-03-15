import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { incomeAllocationGoalUpdateSchema } from "@/lib/financeiro/schema";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode editar metas", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const { goalId } = await params;
    const payload = await request.json();
    const parseResult = incomeAllocationGoalUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const existing = await prisma.incomeAllocationGoal.findFirst({
      where: { id: goalId, householdId: auth.context.householdId },
    });
    if (!existing) return sendError("Meta não encontrada", 404, undefined, "GOAL_NOT_FOUND");

    const updated = await prisma.incomeAllocationGoal.update({
      where: { id: goalId },
      data: parseResult.data,
    });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      action: "INCOME_ALLOCATION_GOAL_UPDATED",
      entityType: "INCOME_ALLOCATION_GOAL",
      entityId: updated.id,
    });

    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a meta", 500, error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode remover metas", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const { goalId } = await params;

    const deleted = await prisma.incomeAllocationGoal.deleteMany({
      where: { id: goalId, householdId: auth.context.householdId },
    });

    if (deleted.count === 0) return sendError("Meta não encontrada", 404, undefined, "GOAL_NOT_FOUND");

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      action: "INCOME_ALLOCATION_GOAL_DELETED",
      entityType: "INCOME_ALLOCATION_GOAL",
      entityId: goalId,
    });

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a meta", 500, error);
  }
}
