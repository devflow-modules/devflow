import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { getConversationById } from "@/modules/conversations";
import { getTenantById } from "@/modules/tenants";
import { sendReplyAndPersist } from "@/modules/messaging";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Body must include non-empty 'text'" }, { status: 400 });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  try {
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const tenant = await getTenantById(conversation.tenant_id);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const to = conversation.wa_from.replace(/\D/g, "");
    await sendReplyAndPersist({
      tenant: {
        id: tenant.id,
        phoneNumberId: tenant.phone_number_id,
        displayPhoneNumber: tenant.display_phone_number ?? "",
        accessToken: tenant.access_token,
      },
      to,
      text,
      conversationId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/conversations/:id/send]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
