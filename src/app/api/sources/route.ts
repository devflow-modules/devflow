import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { sourceCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listSources } from "@/modules/financeiro/services/sources/listSources";
import { createSource } from "@/modules/financeiro/services/sources/createSource";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const sources = await listSources(prisma, householdId);
    return sendSuccess(sources);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as fontes", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const payload = await request.json();
    const parseResult = sourceCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const source = await createSource(prisma, householdId, parseResult.data, { userId, householdId });
    return sendSuccess(source, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a fonte", 500, error);
  }
}
