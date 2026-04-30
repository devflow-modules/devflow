import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");

  const threads = await prisma.waInboxThread.findMany({
    where: { tenantId: auth!.payload.tenantId },
    select: { id: true },
  });
  const threadIds = threads.map((t) => t.id);
  if (threadIds.length === 0) {
    return NextResponse.json({ positive: 0, total: 0, rate: 0 });
  }

  const where: { conversationId: { in: string[] }; createdAt?: { gte?: Date; lte?: Date } } = {
    conversationId: { in: threadIds },
  };
  if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

  const feedbacks = await prisma.messageFeedback.findMany({
    where,
    select: { rating: true },
  });
  const positive = feedbacks.filter((f) => f.rating === 1).length;
  const total = feedbacks.length;
  return NextResponse.json({
    positive,
    total,
    rate: total > 0 ? Math.round((positive / total) * 100) / 100 : 0,
  });
}
