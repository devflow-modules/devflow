import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { personalAllocationGoalUpdateSchema } from "@/lib/financeiro/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { goalId } = await params;
    const existing = await prisma.personalAllocationGoal.findFirst({
      where: {
        id: goalId,
        userId: auth.context.userId,
        householdId: auth.context.householdId,
      },
    });
    if (!existing) return sendError("Meta pessoal não encontrada", 404, undefined, "GOAL_NOT_FOUND");

    const payload = await request.json();
    const parseResult = personalAllocationGoalUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const updated = await prisma.personalAllocationGoal.update({
      where: { id: goalId },
      data: parseResult.data,
    });

    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar sua meta pessoal", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { goalId } = await params;

    const deleted = await prisma.personalAllocationGoal.deleteMany({
      where: {
        id: goalId,
        userId: auth.context.userId,
        householdId: auth.context.householdId,
      },
    });

    if (deleted.count === 0) return sendError("Meta pessoal não encontrada", 404, undefined, "GOAL_NOT_FOUND");

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover sua meta pessoal", 500, error);
  }
}
