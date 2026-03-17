import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations, listConversationsByStatus } from "@/modules/conversations";
import { listTenants } from "@/modules/tenants";
import { getLastMessageForConversationIds } from "@/modules/messaging";
import type { ConversationStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ConversationStatus[] = [
  "open",
  "waiting_queue",
  "waiting",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

export type AdminConversationItem = {
  id: string;
  customerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  status?: string;
};

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [], total: 0 });
  }
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ conversations: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const conversations =
      statusParam && VALID_STATUSES.includes(statusParam as ConversationStatus)
        ? await listConversationsByStatus(tenantId, statusParam as ConversationStatus, 100)
        : await listConversations(tenantId, 100);

    const ids = conversations.map((c) => c.id);
    const lastMessages = await getLastMessageForConversationIds(ids);

    const items: AdminConversationItem[] = conversations.map((c) => {
      const last = lastMessages.get(c.id);
      return {
        id: c.id,
        customerName: c.wa_from ?? "—",
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? null,
        unread: 0,
        status: c.status,
      };
    });

    return NextResponse.json({ conversations: items, total: items.length });
  } catch (err) {
    console.error("[GET /api/admin/conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
