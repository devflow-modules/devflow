import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { sourceUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateSource } from "@/modules/financeiro/services/sources/updateSource";
import { deleteSource } from "@/modules/financeiro/services/sources/deleteSource";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { sourceId } = await params;
    const payload = await request.json();
    const parseResult = sourceUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const updated = await updateSource(prisma, sourceId, householdId, parseResult.data, { userId, householdId });
    if (!updated) return sendError("Fonte não encontrada", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a fonte", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { sourceId } = await params;
    const deleted = await deleteSource(prisma, sourceId, householdId, { userId, householdId });
    if (!deleted) return sendError("Fonte não encontrada", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a fonte", 500, error);
  }
}
