import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { ruleUpdateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { ruleId } = await params;
    const payload = await request.json();

    const parseResult = ruleUpdateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const existingRule = await prisma.rule.findFirst({
      where: { id: ruleId, householdId },
    });
    if (!existingRule) return sendError("Regra não encontrada", 404);

    const data: Record<string, unknown> = { ...parseResult.data };

    if (data.sourceIds) {
      data.ruleSources = {
        deleteMany: {},
        create: (data.sourceIds as string[]).map((sourceId: string) => ({ source: { connect: { id: sourceId } } })),
      };
      delete data.sourceIds;
    }

    const updated = await prisma.rule.update({
      where: { id: ruleId },
      data,
      include: { ruleSources: { include: { source: true } } },
    });

    if (updated) {
      await createAuditLog(prisma, {
        userId: auth.context.userId,
        householdId,
        action: AUDIT_ACTIONS.RULE_UPDATED,
        entityType: AUDIT_ENTITY.RULE,
        entityId: updated.id,
        metadata: { name: updated.name, ruleType: updated.ruleType },
      });
    }

    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a regra", 500, error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { ruleId } = await params;

    const deleted = await prisma.rule.deleteMany({ where: { id: ruleId, householdId } });

    if (deleted.count === 0) {
      return sendError("Regra não encontrada", 404);
    }

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.RULE_DELETED,
      entityType: AUDIT_ENTITY.RULE,
      entityId: ruleId,
    });

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a regra", 500, error);
  }
}
