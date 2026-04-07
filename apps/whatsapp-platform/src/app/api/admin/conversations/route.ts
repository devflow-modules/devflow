import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listTenants } from "@/modules/tenants";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

export const dynamic = "force-dynamic";

const VALID_THREAD_STATUSES: WaInboxThreadStatus[] = ["OPEN", "PENDING", "CLOSED"];

export type AdminConversationItem = {
  id: string;
  customerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  status?: string;
};

export async function GET(request: NextRequest) {
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ conversations: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const statusFilter =
      statusParam && VALID_THREAD_STATUSES.includes(statusParam as WaInboxThreadStatus)
        ? (statusParam as WaInboxThreadStatus)
        : undefined;

    const threads = await prisma.waInboxThread.findMany({
      where: {
        tenantId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        lastMessagePreview: true,
        lastMessageAt: true,
        unreadCount: true,
        status: true,
      },
    });

    const items: AdminConversationItem[] = threads.map((t) => ({
      id: t.id,
      customerName: t.contactName ?? t.phoneNumber,
      lastMessage: t.lastMessagePreview ?? null,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      unread: t.unreadCount,
      status: t.status,
    }));

    return NextResponse.json({ conversations: items, total: items.length });
  } catch (err) {
    console.error("[GET /api/admin/conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
