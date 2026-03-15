import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { sourceUpdateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { sourceId } = await params;
    const payload = await request.json();

    const parseResult = sourceUpdateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const source = await prisma.source.updateMany({
      where: { id: sourceId, householdId },
      data: parseResult.data,
    });

    if (source.count === 0) {
      return sendError("Fonte não encontrada", 404);
    }

    const updated = await prisma.source.findUnique({ where: { id: sourceId } });

    if (updated) {
      await createAuditLog(prisma, {
        userId: auth.context.userId,
        householdId,
        action: AUDIT_ACTIONS.SOURCE_UPDATED,
        entityType: AUDIT_ENTITY.SOURCE,
        entityId: updated.id,
        metadata: { name: updated.name, sourceType: updated.sourceType },
      });
    }

    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a fonte", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { sourceId } = await params;

    const deleted = await prisma.source.deleteMany({
      where: { id: sourceId, householdId },
    });

    if (deleted.count === 0) {
      return sendError("Fonte não encontrada", 404);
    }

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.SOURCE_DELETED,
      entityType: AUDIT_ENTITY.SOURCE,
      entityId: sourceId,
    });

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a fonte", 500, error);
  }
}
