import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { categoryUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateCategory, deleteCategory } from "@/modules/financeiro/services/categories";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { categoryId } = await params;
  try {
    const payload = await request.json();
    const parsed = categoryUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const updated = await updateCategory(prisma, categoryId, auth.context.householdId, parsed.data);
    if (!updated) return sendError("Categoria não encontrada", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a categoria", 500, error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const sameOrigin = assertSameOrigin(_request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(_request);
  if (!auth.ok) return auth.response;
  const { categoryId } = await params;
  try {
    const deleted = await deleteCategory(prisma, categoryId, auth.context.householdId);
    if (!deleted) return sendError("Categoria não encontrada", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a categoria", 500, error);
  }
}
