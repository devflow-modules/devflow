import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { buildInviteEmailHtml, sendEmail } from "@/lib/email";
import { trackFeatureUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

export type CreateInviteInput = {
  email: string;
  role: "MEMBER" | "OWNER";
};

export type CreateInviteContext = {
  userId: string;
  householdId: string;
  callerEmail: string;
  origin: string;
};

export type CreateInviteResult =
  | { ok: true; invite: { id: string; email: string; role: string; expiresAt: Date }; acceptUrl: string; emailSent: boolean }
  | { ok: false; code: "INVITE_SELF" }
  | { ok: false; code: "ALREADY_MEMBER" }
  | { ok: false; code: "INVITE_ALREADY_PENDING"; inviteId: string; expiresAt: Date; acceptUrl: string };

export async function createInvite(
  prisma: PrismaClient,
  data: CreateInviteInput,
  context: CreateInviteContext
): Promise<CreateInviteResult> {
  const email = data.email.trim().toLowerCase();
  const role = data.role;
  const callerEmail = context.callerEmail.trim().toLowerCase();

  if (email === callerEmail) {
    return { ok: false, code: "INVITE_SELF" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const existingMembership = await prisma.householdMembership.findFirst({
      where: { householdId: context.householdId, userId: existingUser.id },
      select: { id: true },
    });
    if (existingMembership) {
      return { ok: false, code: "ALREADY_MEMBER" };
    }
  }

  const pending = await prisma.invite.findFirst({
    where: {
      householdId: context.householdId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, token: true, expiresAt: true },
  });
  if (pending) {
    const acceptUrl = `${context.origin}${FINANCEIRO_BASE_PATH}/invites/accept?token=${encodeURIComponent(pending.token)}`;
    return {
      ok: false,
      code: "INVITE_ALREADY_PENDING",
      inviteId: pending.id,
      expiresAt: pending.expiresAt,
      acceptUrl,
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const invite = await prisma.invite.create({
    data: {
      householdId: context.householdId,
      email,
      role,
      token,
      expiresAt,
    },
  });

  const acceptUrl = `${context.origin}${FINANCEIRO_BASE_PATH}/invites/accept?token=${encodeURIComponent(invite.token)}`;
  const household = await prisma.household.findUnique({ where: { id: context.householdId } });
  const emailResult = await sendEmail({
    to: invite.email,
    subject: `Convite para a casa ${household?.name ?? "Financeiro"}`,
    html: buildInviteEmailHtml({ householdName: household?.name ?? "Financeiro", acceptUrl }),
  });
  if (!emailResult.ok) {
    console.warn("Falha ao enviar e-mail de convite (fallback: link)", emailResult.error);
  }

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId: context.householdId,
    action: AUDIT_ACTIONS.INVITE_CREATED,
    entityType: AUDIT_ENTITY.INVITE,
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
  });

  emit("finance.invite.sent", {
    householdId: context.householdId,
    userId: context.userId,
    entityId: invite.id,
    timestamp: new Date().toISOString(),
  });

  trackFeatureUsage("household.invite", {
    userId: context.userId,
    householdId: context.householdId,
  });

  return {
    ok: true,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
    acceptUrl,
    emailSent: emailResult.ok,
  };
}
