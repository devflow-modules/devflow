import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { cycleCreateSchema } from "@/lib/financeiro/schema";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const cycles = await prisma.cycle.findMany({
      where: { householdId: auth.context.householdId },
      orderBy: [{ cycleType: "asc" }, { name: "asc" }],
    });
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

    const data = parseResult.data;
    const cycle = await prisma.cycle.create({
      data: {
        householdId: auth.context.householdId,
        name: data.name,
        cycleType: data.cycleType,
        anchorDay: data.anchorDay ?? null,
        anchorWeekDay: data.anchorWeekDay ?? null,
      },
    });

    return sendSuccess(cycle, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o ciclo", 500, error);
  }
}
