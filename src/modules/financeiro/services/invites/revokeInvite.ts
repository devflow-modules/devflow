import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type RevokeInviteContext = {
  userId: string;
  householdId: string;
};

export type RevokeInviteResult =
  | { ok: true }
  | { ok: false; code: "INVITE_NOT_FOUND" }
  | { ok: false; code: "INVITE_ALREADY_ACCEPTED" };

export async function revokeInvite(
  prisma: PrismaClient,
  inviteId: string,
  context: RevokeInviteContext
): Promise<RevokeInviteResult> {
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, householdId: context.householdId },
  });

  if (!invite) return { ok: false, code: "INVITE_NOT_FOUND" };
  if (invite.acceptedAt) return { ok: false, code: "INVITE_ALREADY_ACCEPTED" };

  await prisma.invite.delete({ where: { id: inviteId } });

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId: context.householdId,
    action: AUDIT_ACTIONS.INVITE_REVOKED,
    entityType: AUDIT_ENTITY.INVITE,
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return { ok: true };
}
