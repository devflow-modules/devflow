import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { cycleUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { getCycle } from "@/modules/financeiro/services/cycles/getCycle";
import { updateCycle } from "@/modules/financeiro/services/cycles/updateCycle";
import { deleteCycle } from "@/modules/financeiro/services/cycles/deleteCycle";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { cycleId } = await params;
    const cycle = await getCycle(prisma, cycleId, auth.context.householdId);
    if (!cycle) return sendError("Ciclo não encontrado", 404, undefined, "CYCLE_NOT_FOUND");
    return sendSuccess(cycle);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar o ciclo", 500, error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { cycleId } = await params;
    const payload = await request.json();
    const parseResult = cycleUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const updated = await updateCycle(prisma, cycleId, auth.context.householdId, parseResult.data);
    if (!updated) return sendError("Ciclo não encontrado", 404, undefined, "CYCLE_NOT_FOUND");
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar o ciclo", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { cycleId } = await params;
    const deleted = await deleteCycle(prisma, cycleId, auth.context.householdId);
    if (!deleted) return sendError("Ciclo não encontrado", 404, undefined, "CYCLE_NOT_FOUND");
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover o ciclo", 500, error);
  }
}
