import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { getConversationById } from "@/modules/conversations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  try {
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: conversation.id,
      customerName: conversation.wa_from,
      status: conversation.status,
    });
  } catch (err) {
    console.error("[GET /api/admin/conversations/:id]", err);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}
