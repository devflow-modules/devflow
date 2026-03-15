import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { ruleCreateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {

    const rules = await prisma.rule.findMany({
      where: { householdId },
      include: {
        ruleSources: {
          include: { source: true },
        },
      },
    });

    return sendSuccess(rules);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as regras", 500, error);
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

    const parseResult = ruleCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const { sourceIds, ...rulePayload } = parseResult.data;

    const rule = await prisma.rule.create({
      data: {
        ...rulePayload,
        householdId,
        ruleSources: {
          create: sourceIds.map((sourceId) => ({ source: { connect: { id: sourceId } } })),
        },
      },
      include: {
        ruleSources: {
          include: { source: true },
        },
      },
    });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.RULE_CREATED,
      entityType: AUDIT_ENTITY.RULE,
      entityId: rule.id,
      metadata: { name: rule.name, ruleType: rule.ruleType },
    });

    return sendSuccess(rule, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a regra", 500, error);
  }
}
