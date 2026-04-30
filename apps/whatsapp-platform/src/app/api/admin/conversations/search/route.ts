import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ conversations: [] });

  const messages = await prisma.waInboxMessage.findMany({
    where: {
      tenantId: auth!.payload.tenantId,
      contentText: { contains: q, mode: "insensitive" },
    },
    take: 100,
    select: { threadId: true },
  });
  const threadIds = [...new Set(messages.map((m) => m.threadId))];
  if (threadIds.length === 0) return NextResponse.json({ conversations: [] });

  const threads = await prisma.waInboxThread.findMany({
    where: { id: { in: threadIds }, tenantId: auth!.payload.tenantId },
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json({
    conversations: threads.map((t) => ({
      id: t.id,
      externalId: t.phoneNumber,
      updatedAt: t.updatedAt.toISOString(),
      messageCount: t._count.messages,
    })),
  });
}
