import { prisma } from "@/lib/prisma";
import { getAccessTokenExpiryDate } from "@/lib/auth-config";

/**
 * Cria sessão persistida; o id é emitido no JWT como `jti`.
 */
export async function createUserSession(userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
  const expiresAt = getAccessTokenExpiryDate();
  const row = await prisma.userSession.create({
    data: { userId, expiresAt },
  });
  return { sessionId: row.id, expiresAt: row.expiresAt };
}

export async function revokeUserSession(sessionId: string): Promise<void> {
  const now = new Date();
  await prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: now },
  });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  const now = new Date();
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
}
