import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const queues = await prisma.conversationQueue.findMany({
    where: { tenantId: auth.payload.tenantId },
    orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
    take: 100,
    include: { conversation: true },
  });

  return NextResponse.json({ queues });
}
