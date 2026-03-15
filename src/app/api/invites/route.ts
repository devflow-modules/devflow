import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { inviteCreateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { buildInviteEmailHtml, sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode listar convites", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const invites = await prisma.invite.findMany({
      where: {
        householdId: auth.context.householdId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });

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

    const email = parseResult.data.email.trim().toLowerCase();
    const role = parseResult.data.role;

    const callerEmail = auth.context.email.trim().toLowerCase();
    if (email === callerEmail) {
      return sendError("Você já está na casa. Não é possível convidar o próprio e-mail.", 400, undefined, "INVITE_SELF");
    }

    // Se já existe usuário com esse e-mail e ele já é membro da casa, bloqueia.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const existingMembership = await prisma.householdMembership.findFirst({
        where: { householdId: auth.context.householdId, userId: existingUser.id },
        select: { id: true },
      });
      if (existingMembership) {
        return sendError("Este e-mail já é membro desta casa.", 409, undefined, "ALREADY_MEMBER");
      }
    }

    // Evita duplicidade: 1 convite pendente por e-mail por casa (não aceito e não expirado).
    const pending = await prisma.invite.findFirst({
      where: {
        householdId: auth.context.householdId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, token: true, expiresAt: true },
    });
    if (pending) {
      const origin = request.nextUrl.origin;
      const acceptUrl = `${origin}/ferramentas/financeiro/invites/accept?token=${encodeURIComponent(pending.token)}`;
      return sendError(
        "Já existe um convite pendente para este e-mail.",
        409,
        { inviteId: pending.id, expiresAt: pending.expiresAt, acceptUrl },
        "INVITE_ALREADY_PENDING"
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias

    const invite = await prisma.invite.create({
      data: {
        householdId: auth.context.householdId,
        email,
        role,
        token,
        expiresAt,
      },
    });

    const origin = request.nextUrl.origin;
    const acceptUrl = `${origin}/ferramentas/financeiro/invites/accept?token=${encodeURIComponent(invite.token)}`;

    const household = await prisma.household.findUnique({ where: { id: auth.context.householdId } });
    const emailResult = await sendEmail({
      to: invite.email,
      subject: `Convite para a casa ${household?.name ?? "Financeiro"}`,
      html: buildInviteEmailHtml({ householdName: household?.name ?? "Financeiro", acceptUrl }),
    });
    if (!emailResult.ok) {
      console.warn("Falha ao enviar e-mail de convite (fallback: link)", emailResult.error);
    }

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      action: AUDIT_ACTIONS.INVITE_CREATED,
      entityType: AUDIT_ENTITY.INVITE,
      entityId: invite.id,
      metadata: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
    });

    return sendSuccess(
      {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        acceptUrl,
        emailSent: emailResult.ok,
      },
      201,
      "Convite criado"
    );
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o convite", 500, error);
  }
}
