import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type AcceptInviteContext = {
  userId: string;
  email: string;
};

export type AcceptInviteResult =
  | { ok: true; householdId: string; role: string }
  | { ok: false; code: "INVITE_INVALID" }
  | { ok: false; code: "INVITE_USED" }
  | { ok: false; code: "INVITE_EXPIRED" }
  | { ok: false; code: "INVITE_EMAIL_MISMATCH" };

export async function acceptInvite(
  prisma: PrismaClient,
  token: string,
  context: AcceptInviteContext
): Promise<AcceptInviteResult> {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) return { ok: false, code: "INVITE_INVALID" };
  if (invite.acceptedAt) return { ok: false, code: "INVITE_USED" };
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, code: "INVITE_EXPIRED" };

  const authEmail = context.email.trim().toLowerCase();
  if (invite.email.trim().toLowerCase() !== authEmail) {
    return { ok: false, code: "INVITE_EMAIL_MISMATCH" };
  }

  const existing = await prisma.householdMembership.findFirst({
    where: { userId: context.userId, householdId: invite.householdId },
  });

  if (!existing) {
    await prisma.householdMembership.create({
      data: {
        userId: context.userId,
        householdId: invite.householdId,
        role: invite.role,
      },
    });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedByUserId: context.userId },
  });

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId: invite.householdId,
    action: AUDIT_ACTIONS.INVITE_ACCEPTED,
    entityType: AUDIT_ENTITY.INVITE,
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return {
    ok: true,
    householdId: invite.householdId,
    role: invite.role,
  };
}
