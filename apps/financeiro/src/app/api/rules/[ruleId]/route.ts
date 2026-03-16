import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { ruleUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateRule } from "@/modules/financeiro/services/rules/updateRule";
import { deleteRule } from "@/modules/financeiro/services/rules/deleteRule";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { ruleId } = await params;
    const payload = await request.json();
    const parseResult = ruleUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const updated = await updateRule(prisma, ruleId, householdId, parseResult.data, { userId, householdId });
    if (!updated) return sendError("Regra não encontrada", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a regra", 500, error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { ruleId } = await params;
    const deleted = await deleteRule(prisma, ruleId, householdId, { userId, householdId });
    if (!deleted) return sendError("Regra não encontrada", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a regra", 500, error);
  }
}
