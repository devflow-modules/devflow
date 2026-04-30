import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { getClientIp } from "@/lib/rate-limit";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { sendReplyAndPersist } from "@/modules/messaging";
import { logAction } from "@/modules/inbox/auditService";
import { logError, logEvent } from "@/lib/observability";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import { assertWhatsappPhoneNumberSendable } from "@/modules/whatsapp/whatsappChannelGuards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

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
      where: { id, tenantId: auth!.payload.tenantId },
    });
    if (!thread) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const lineRow = await prisma.whatsappPhoneNumber.findFirst({
      where: {
        tenantId: auth!.payload.tenantId,
        phoneNumberId: thread.businessPhoneNumberId,
      },
    });
    try {
      assertWhatsappPhoneNumberSendable(lineRow);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "CHANNEL_NOT_ACTIVE") {
        return NextResponse.json({ error: "CHANNEL_NOT_ACTIVE" }, { status: 403 });
      }
      return NextResponse.json(
        { error: "WhatsApp not configured for this tenant" },
        { status: 503 }
      );
    }
    const messagingTenant = await resolveMessagingTenantForOutbound(
      auth!.payload.tenantId,
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
    await logAction(auth!.payload.tenantId, thread.id, auth!.payload.sub, "message_send", {
      source: "admin_conversations_api",
      textLength: text.length,
    });
    recordPlatformAudit({
      action: "admin.conversation.send",
      tenantId: auth!.payload.tenantId,
      userId: auth!.payload.sub,
      resourceType: "wa_inbox_thread",
      resourceId: thread.id,
      metadata: { ip: getClientIp(request), textLength: text.length },
    });
    logEvent("info", "admin", "conversation_message_sent", {
      tenantId: auth!.payload.tenantId,
      threadId: thread.id,
      userId: auth!.payload.sub,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("admin", err, { route: "admin_conversation_send", threadId: id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
