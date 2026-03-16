import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { cycleCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listCycles } from "@/modules/financeiro/services/cycles/listCycles";
import { createCycle } from "@/modules/financeiro/services/cycles/createCycle";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const cycles = await listCycles(prisma, auth.context.householdId);
    return sendSuccess(cycles);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os ciclos", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const parseResult = cycleCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const cycle = await createCycle(prisma, auth.context.householdId, parseResult.data);
    return sendSuccess(cycle, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o ciclo", 500, error);
  }
}
