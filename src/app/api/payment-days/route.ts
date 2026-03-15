import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { paymentDaySchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {

    const days = await prisma.paymentDay.findMany({
      where: {
        source: {
          householdId,
        },
      },
      orderBy: { dayOfMonth: "asc" },
    });

    return sendSuccess(days);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os dias de recebimento", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const payload = await request.json();
    const parseResult = paymentDaySchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const { sourceId, cycleId, ...dayPayload } = parseResult.data;

    const source = await prisma.source.findFirst({
      where: { id: sourceId, householdId },
    });
    if (!source) {
      return sendError("Fonte não encontrada ou não pertence à sua casa", 404);
    }

    if (cycleId) {
      const cycle = await prisma.cycle.findFirst({
        where: { id: cycleId, householdId },
      });
      if (!cycle) return sendError("Ciclo não encontrado ou não pertence à sua casa", 404);
    }

    const day = await prisma.paymentDay.create({
      data: {
        ...dayPayload,
        source: { connect: { id: sourceId } },
        ...(cycleId ? { cycle: { connect: { id: cycleId } } } : {}),
      },
    });

    return sendSuccess(day, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o dia de recebimento", 500, error);
  }
}
