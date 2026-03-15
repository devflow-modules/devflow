import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { inviteAcceptSchema } from "@/modules/financeiro/schemas";
import { requireSessionOnly } from "@/app/api/_helpers/auth";
import { setActiveHouseholdCookie } from "@/modules/financeiro/adapters/cookies/householdCookie";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { acceptInvite } from "@/modules/financeiro/services/invites/acceptInvite";

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
    const result = await acceptInvite(prisma, parseResult.data.token, {
      userId: auth.userId,
      email: auth.email,
    });
    if (!result.ok) {
      if (result.code === "INVITE_INVALID") return sendError("Convite inválido", 404, undefined, "INVITE_INVALID");
      if (result.code === "INVITE_USED") return sendError("Convite já foi utilizado", 409, undefined, "INVITE_USED");
      if (result.code === "INVITE_EXPIRED") return sendError("Convite expirado", 410, undefined, "INVITE_EXPIRED");
      return sendError("Este convite não é para o seu e-mail", 403, undefined, "INVITE_EMAIL_MISMATCH");
    }
    const response = sendSuccess(
      { householdId: result.householdId, role: result.role, accepted: true },
      200,
      "Convite aceito"
    );
    setActiveHouseholdCookie(response, result.householdId);
    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível aceitar o convite", 500, error);
  }
}
