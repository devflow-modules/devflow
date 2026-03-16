import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { categoryCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listCategories, createCategory } from "@/modules/financeiro/services/categories";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  try {
    const categories = await listCategories(prisma, auth.context.householdId);
    return sendSuccess(categories);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as categorias", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  try {
    const payload = await request.json();
    const parsed = categoryCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const category = await createCategory(prisma, auth.context.householdId, parsed.data);
    return sendSuccess(category, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a categoria", 500, error);
  }
}
