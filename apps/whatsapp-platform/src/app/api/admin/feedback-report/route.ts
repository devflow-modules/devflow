import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dateFrom = request.nextUrl.searchParams.get("dateFrom");
  const dateTo = request.nextUrl.searchParams.get("dateTo");
  const convIds = await prisma.conversation.findMany({
    where: { tenantId: auth.payload.tenantId },
    select: { id: true },
  });
  const ids = convIds.map((c) => c.id);
  const where: { conversationId: { in: string[] }; createdAt?: { gte?: Date; lte?: Date } } = {
    conversationId: { in: ids },
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
