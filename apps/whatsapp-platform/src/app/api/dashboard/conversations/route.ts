import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations } from "@/modules/conversations";

/**
 * Lista conversas para o dashboard (primeiro tenant por enquanto).
 */
export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [], total: 0 });
  }
  try {
    const { listTenants } = await import("@/modules/tenants");
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return NextResponse.json({ conversations: [], total: 0 });
    }
    const conversations = await listConversations(tenantId, 50);
    return NextResponse.json({ conversations, total: conversations.length });
  } catch (err) {
    console.error("[Dashboard conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
