import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { cycleUpdateSchema } from "@/lib/financeiro/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { cycleId } = await params;
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, householdId: auth.context.householdId },
    });
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
    const existing = await prisma.cycle.findFirst({
      where: { id: cycleId, householdId: auth.context.householdId },
    });
    if (!existing) return sendError("Ciclo não encontrado", 404, undefined, "CYCLE_NOT_FOUND");

    const payload = await request.json();
    const parseResult = cycleUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const data = parseResult.data;
    const updated = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.cycleType != null && { cycleType: data.cycleType }),
        ...(data.anchorDay !== undefined && { anchorDay: data.anchorDay ?? null }),
        ...(data.anchorWeekDay !== undefined && { anchorWeekDay: data.anchorWeekDay ?? null }),
      },
    });

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

    const deleted = await prisma.cycle.deleteMany({
      where: { id: cycleId, householdId: auth.context.householdId },
    });

    if (deleted.count === 0) return sendError("Ciclo não encontrado", 404, undefined, "CYCLE_NOT_FOUND");

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover o ciclo", 500, error);
  }
}
