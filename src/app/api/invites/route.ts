import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { inviteCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listInvites } from "@/modules/financeiro/services/invites/listInvites";
import { createInvite } from "@/modules/financeiro/services/invites/createInvite";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode listar convites", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const invites = await listInvites(prisma, auth.context.householdId);
    return sendSuccess(invites);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os convites", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode criar convites", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const payload = await request.json();
    const parseResult = inviteCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const result = await createInvite(prisma, parseResult.data, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      callerEmail: auth.context.email,
      origin: request.nextUrl.origin,
    });
    if (!result.ok) {
      if (result.code === "INVITE_SELF") {
        return sendError("Você já está na casa. Não é possível convidar o próprio e-mail.", 400, undefined, "INVITE_SELF");
      }
      if (result.code === "ALREADY_MEMBER") {
        return sendError("Este e-mail já é membro desta casa.", 409, undefined, "ALREADY_MEMBER");
      }
      return sendError(
        "Já existe um convite pendente para este e-mail.",
        409,
        { inviteId: result.inviteId, expiresAt: result.expiresAt, acceptUrl: result.acceptUrl },
        "INVITE_ALREADY_PENDING"
      );
    }
    return sendSuccess(
      {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        expiresAt: result.invite.expiresAt,
        acceptUrl: result.acceptUrl,
        emailSent: result.emailSent,
      },
      201,
      "Convite criado"
    );
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o convite", 500, error);
  }
}
