import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listTenants } from "@/modules/tenants";
import { WaInboxDirection } from "@/generated/prisma-whatsapp";

export const dynamic = "force-dynamic";

export type AdminMessageItem = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  if (!threadId) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ messages: [] });
    }
    const thread = await prisma.waInboxThread.findFirst({
      where: { id: threadId, tenantId },
      select: { id: true },
    });
    if (!thread) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const rows = await prisma.waInboxMessage.findMany({
      where: { tenantId, threadId: thread.id },
      orderBy: { ts: "asc" },
      take: 500,
      select: {
        id: true,
        direction: true,
        contentText: true,
        ts: true,
      },
    });
    const items: AdminMessageItem[] = rows.map((m) => ({
      id: m.id,
      direction: m.direction === WaInboxDirection.INBOUND ? "inbound" : "outbound",
      body: m.contentText ?? "",
      created_at: m.ts.toISOString(),
    }));
    return NextResponse.json({ messages: items });
  } catch (err) {
    console.error("[GET /api/admin/conversations/:id/messages]", err);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}
