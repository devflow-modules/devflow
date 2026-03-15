import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { activeHouseholdSetSchema } from "@/lib/financeiro/schema";
import {
  requireSessionOnly,
  getActiveHouseholdCookieName,
} from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = activeHouseholdSetSchema.safeParse(body);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { householdId } = parsed.data;

    const membership = await prisma.householdMembership.findFirst({
      where: { userId: auth.userId, householdId },
    });

    if (!membership) {
      return sendError("Acesso negado a esta casa", 403);
    }

    const previousHouseholdId = request.cookies.get(getActiveHouseholdCookieName())?.value ?? null;

    await createAuditLog(prisma, {
      userId: auth.userId,
      householdId,
      action: AUDIT_ACTIONS.ACTIVE_HOUSEHOLD_SET,
      entityType: AUDIT_ENTITY.HOUSEHOLD,
      entityId: householdId,
      metadata: { previousHouseholdId },
    });

    const response = sendSuccess({ activeHouseholdId: householdId });
    response.cookies.set(getActiveHouseholdCookieName(), householdId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error(error);
    return sendError("Erro ao definir casa ativa", 500, error);
  }
}
