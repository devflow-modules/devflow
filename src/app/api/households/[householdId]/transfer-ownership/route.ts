import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { householdTransferOwnershipSchema } from "@/lib/financeiro/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }

    if (auth.context.membershipRole !== "OWNER") {
      return sendError("Apenas OWNER pode transferir a titularidade", 403, undefined, "OWNER_REQUIRED");
    }

    const payload = await request.json();
    const parsed = householdTransferOwnershipSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { newOwnerMembershipId } = parsed.data;

    const callerMembership = await prisma.householdMembership.findFirst({
      where: { userId: auth.context.userId, householdId },
      include: { user: true },
    });
    const newOwnerMembership = await prisma.householdMembership.findFirst({
      where: { id: newOwnerMembershipId, householdId },
      include: { user: true },
    });

    if (!callerMembership || callerMembership.role !== "OWNER") {
      return sendError("Você não é OWNER desta casa", 403, undefined, "NOT_OWNER");
    }
    if (!newOwnerMembership) {
      return sendError("Membro não encontrado nesta casa", 404, undefined, "NOT_FOUND");
    }
    if (newOwnerMembership.userId === auth.context.userId) {
      return sendError("Escolha outro membro para transferir a titularidade", 400, undefined, "SAME_USER");
    }
    if (newOwnerMembership.role !== "MEMBER") {
      return sendError("O novo titular deve ser um MEMBER", 400, undefined, "TARGET_MUST_BE_MEMBER");
    }

    await prisma.$transaction([
      prisma.householdMembership.update({
        where: { id: callerMembership.id },
        data: { role: "MEMBER" },
      }),
      prisma.householdMembership.update({
        where: { id: newOwnerMembershipId },
        data: { role: "OWNER" },
      }),
    ]);

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
      entityType: AUDIT_ENTITY.MEMBERSHIP,
      entityId: newOwnerMembershipId,
      metadata: {
        fromUserId: callerMembership.userId,
        toUserId: newOwnerMembership.userId,
        householdId,
        fromMembershipId: callerMembership.id,
        toMembershipId: newOwnerMembershipId,
      },
    });

    return sendSuccess(
      {
        householdId,
        fromUserId: callerMembership.userId,
        toUserId: newOwnerMembership.userId,
        fromMembershipId: callerMembership.id,
        toMembershipId: newOwnerMembershipId,
      },
      200,
      "Titularidade transferida"
    );
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível transferir a titularidade", 500, error);
  }
}
