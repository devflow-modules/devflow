import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { inviteAcceptSchema } from "@/lib/financeiro/schema";
import { requireSessionOnly, getActiveHouseholdCookieName } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const parseResult = inviteAcceptSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const token = parseResult.data.token;
    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite) return sendError("Convite inválido", 404, undefined, "INVITE_INVALID");
    if (invite.acceptedAt) return sendError("Convite já foi utilizado", 409, undefined, "INVITE_USED");
    if (invite.expiresAt.getTime() < Date.now()) return sendError("Convite expirado", 410, undefined, "INVITE_EXPIRED");

    const authEmail = auth.email.trim().toLowerCase();
    if (invite.email.trim().toLowerCase() !== authEmail) {
      return sendError("Este convite não é para o seu e-mail", 403, undefined, "INVITE_EMAIL_MISMATCH");
    }

    const existing = await prisma.householdMembership.findFirst({
      where: { userId: auth.userId, householdId: invite.householdId },
    });

    if (!existing) {
      await prisma.householdMembership.create({
        data: {
          userId: auth.userId,
          householdId: invite.householdId,
          role: invite.role,
        },
      });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: auth.userId },
    });

    await createAuditLog(prisma, {
      userId: auth.userId,
      householdId: invite.householdId,
      action: AUDIT_ACTIONS.INVITE_ACCEPTED,
      entityType: AUDIT_ENTITY.INVITE,
      entityId: invite.id,
      metadata: { email: invite.email, role: invite.role },
    });

    const response = sendSuccess(
      { householdId: invite.householdId, role: invite.role, accepted: true },
      200,
      "Convite aceito"
    );
    response.cookies.set(getActiveHouseholdCookieName(), invite.householdId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível aceitar o convite", 500, error);
  }
}
