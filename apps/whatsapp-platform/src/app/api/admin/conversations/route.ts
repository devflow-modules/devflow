import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations } from "@/modules/conversations";
import { listTenants } from "@/modules/tenants";
import { getLastMessageForConversationIds } from "@/modules/messaging";

export const dynamic = "force-dynamic";

export type AdminConversationItem = {
  id: string;
  customerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [], total: 0 });
  }
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ conversations: [], total: 0 });
    }
    const conversations = await listConversations(tenantId, 100);
    const ids = conversations.map((c) => c.id);
    const lastMessages = await getLastMessageForConversationIds(ids);

    const items: AdminConversationItem[] = conversations.map((c) => {
      const last = lastMessages.get(c.id);
      return {
        id: c.id,
        customerName: c.wa_from,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? null,
        unread: 0,
      };
    });

    return NextResponse.json({ conversations: items, total: items.length });
  } catch (err) {
    console.error("[GET /api/admin/conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
