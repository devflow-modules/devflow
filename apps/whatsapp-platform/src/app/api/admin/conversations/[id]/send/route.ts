import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { sendReplyAndPersist } from "@/modules/messaging";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ error: "Missing thread id" }, { status: 400 });
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
  try {
    const thread = await prisma.waInboxThread.findFirst({
      where: { id, tenantId: auth.payload.tenantId },
    });
    if (!thread) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const messagingTenant = await resolveMessagingTenantForOutbound(
      auth.payload.tenantId,
      thread.businessPhoneNumberId
    );
    if (!messagingTenant) {
      return NextResponse.json(
        { error: "WhatsApp not configured for this tenant" },
        { status: 503 }
      );
    }
    await sendReplyAndPersist({
      tenant: messagingTenant,
      to: thread.phoneNumber,
      text,
      inboxThreadId: thread.id,
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
