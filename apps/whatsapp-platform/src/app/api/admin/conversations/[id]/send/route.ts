import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { getConversationById, updateConversationStatus } from "@/modules/conversations";
import { getTenantById } from "@/modules/tenants";
import { sendReplyAndPersist } from "@/modules/messaging";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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
    const convTenantId = (conversation as { tenant_id: string }).tenant_id;
    if (convTenantId !== auth.payload.tenantId) {
      return NextResponse.json({ error: "Acesso negado ao tenant" }, { status: 403 });
    }
    const tenant = await getTenantById(convTenantId);
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
    await updateConversationStatus(id, "in_progress");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/conversations/:id/send]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
