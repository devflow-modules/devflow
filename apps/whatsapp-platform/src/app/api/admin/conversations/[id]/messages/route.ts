import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { getConversationById } from "@/modules/conversations";
import { listMessagesByConversation } from "@/modules/messaging";

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
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ messages: [] });
  }
  try {
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const messages = await listMessagesByConversation(id);
    const items: AdminMessageItem[] = messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      created_at: m.created_at,
    }));
    return NextResponse.json({ messages: items });
  } catch (err) {
    console.error("[GET /api/admin/conversations/:id/messages]", err);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}
