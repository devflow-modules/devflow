import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, ROLES_OPERATIONAL, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const patchBodySchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["available", "busy", "offline"]),
  currentConversationId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

  const statuses = await prisma.agentStatus.findMany({
    where: { tenantId: auth!.payload.tenantId },
  });
  const users = await prisma.user.findMany({
    where: { tenantId: auth!.payload.tenantId, role: { in: [...ROLES_OPERATIONAL] } },
    select: { id: true, name: true, email: true, role: true },
  });
  const byUserId = Object.fromEntries(statuses.map((s) => [s.userId, s]));
  const list = users.map((u) => ({
    ...u,
    status: byUserId[u.id]?.status ?? "offline",
    currentConversationId: byUserId[u.id]?.currentConversationId ?? null,
  }));
  return NextResponse.json({ agents: list });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

  const parsed = patchBodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { userId, status, currentConversationId } = parsed.data;
  const updated = await prisma.agentStatus.upsert({
    where: { userId },
    create: {
      tenantId: auth!.payload.tenantId,
      userId,
      status,
      currentConversationId: currentConversationId ?? null,
    },
    update: { status, currentConversationId: currentConversationId ?? undefined, updatedAt: new Date() },
  });
  return NextResponse.json(updated);
}
