import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership, getActiveHouseholdCookieName } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { householdMemberRemoveSchema } from "@/lib/financeiro/schema";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; membershipId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId, membershipId: rawMembershipId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }

    const parsed = householdMemberRemoveSchema.safeParse({ membershipId: rawMembershipId });
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { membershipId } = parsed.data;

    const membership = await prisma.householdMembership.findUnique({
      where: { id: membershipId },
      include: { user: true },
    });

    if (!membership || membership.householdId !== householdId) {
      return sendError("Membro não encontrado", 404, undefined, "NOT_FOUND");
    }

    const isSelf = membership.userId === auth.context.userId;
    const isOwner = auth.context.membershipRole === "OWNER";

    if (!isSelf && !isOwner) {
      return sendError("Apenas OWNER pode remover outros membros", 403, undefined, "FORBIDDEN");
    }

    if (isSelf && membership.role === "OWNER") {
      return sendError(
        "OWNER não pode sair da casa sem transferir a titularidade",
        409,
        undefined,
        "OWNER_CANNOT_LEAVE"
      );
    }

    // Prevent removing the last OWNER
    if (membership.role === "OWNER") {
      const ownersCount = await prisma.householdMembership.count({
        where: { householdId, role: "OWNER", id: { not: membershipId } },
      });
      if (ownersCount === 0) {
        return sendError("Não é possível remover o último OWNER da casa", 409, undefined, "LAST_OWNER");
      }
    }

    await prisma.householdMembership.delete({ where: { id: membershipId } });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId,
      action: isSelf ? AUDIT_ACTIONS.MEMBER_LEFT : AUDIT_ACTIONS.MEMBER_REMOVED,
      entityType: AUDIT_ENTITY.MEMBERSHIP,
      entityId: membershipId,
      metadata: {
        removedUserId: membership.userId,
        removedEmail: membership.user.email,
        removedRole: membership.role,
        byRole: auth.context.membershipRole,
      },
    });

    // If user left the active household, rotate cookie to another household (or clear)
    let nextHouseholdId: string | null = null;
    if (isSelf) {
      const nextMembership = await prisma.householdMembership.findFirst({
        where: { userId: auth.context.userId },
        orderBy: { createdAt: "asc" },
        select: { householdId: true },
      });
      nextHouseholdId = nextMembership?.householdId ?? null;
    }

    const response = sendSuccess({
      removed: true,
      membershipId,
      isSelf,
      nextHouseholdId,
    });

    if (isSelf) {
      if (nextHouseholdId) {
        response.cookies.set(getActiveHouseholdCookieName(), nextHouseholdId, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        });
      } else {
        response.cookies.delete(getActiveHouseholdCookieName());
      }
    }

    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover membro", 500, error);
  }
}
