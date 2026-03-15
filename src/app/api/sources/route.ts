import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { sourceCreateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {

    const sources = await prisma.source.findMany({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      include: {
        paymentDays: { include: { cycle: true } },
      },
    });

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
  const { householdId } = auth.context;

  try {
    const payload = await request.json();

    const parseResult = sourceCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const source = await prisma.source.create({
      data: {
        ...parseResult.data,
        householdId,
      },
    });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.SOURCE_CREATED,
      entityType: AUDIT_ENTITY.SOURCE,
      entityId: source.id,
      metadata: { name: source.name, sourceType: source.sourceType },
    });

    return sendSuccess(source, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a fonte", 500, error);
  }
}
