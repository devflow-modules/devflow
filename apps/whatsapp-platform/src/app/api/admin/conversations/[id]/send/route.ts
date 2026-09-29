import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { getClientIp } from "@/lib/rate-limit";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { logAction, waInboxCreateOutbound } from "@/modules/inbox";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import {
  SEND_ERROR_CODES,
  beginOrLoadSendRequest,
  claimSendForMeta,
  findSendRequest,
  markSendCompleted,
  markSendFailedPreMeta,
  markSendMetaAccepted,
  markSendPersistFailed,
} from "@/modules/inbox/outboundSendRequestService";
import { logError, logEvent } from "@/lib/observability";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import { assertWhatsappPhoneNumberSendable } from "@/modules/whatsapp/whatsappChannelGuards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(4096),
  clientRequestId: z.string().trim().min(8).max(128),
});

function successPayload(waMessageId: string, clientRequestId: string, replayed: boolean) {
  return {
    ok: true,
    success: true as const,
    data: {
      messageId: waMessageId,
      waMessageId,
      clientRequestId,
      status: "sent" as const,
      replayed,
    },
  };
}

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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body must include non-empty 'text' and clientRequestId (min 8)" },
      { status: 400 }
    );
  }
  const { text, clientRequestId } = parsed.data;

  try {
    const thread = await prisma.waInboxThread.findFirst({
      where: { id, tenantId: auth!.payload.tenantId },
    });
    if (!thread) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    let ledger = await findSendRequest(auth!.payload.tenantId, clientRequestId);
    if (ledger) {
      if (ledger.threadId !== thread.id) {
        return NextResponse.json(
          { error: "clientRequestId já usado noutra conversa" },
          { status: 409 }
        );
      }
      if (ledger.text !== text) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: SEND_ERROR_CODES.TEXT_MISMATCH,
              message: "O texto não corresponde ao clientRequestId desta tentativa.",
              clientRequestId,
              retryableMeta: false,
            },
          },
          { status: 409 }
        );
      }
      if (ledger.status === "COMPLETED" && ledger.waMessageId) {
        return NextResponse.json(successPayload(ledger.waMessageId, clientRequestId, true));
      }
      if (ledger.status === "SENDING") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: SEND_ERROR_CODES.IN_PROGRESS,
              message: "Envio já em curso.",
              clientRequestId,
              retryableMeta: false,
            },
          },
          { status: 409 }
        );
      }
      if (ledger.status === "UNKNOWN_OUTCOME") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: SEND_ERROR_CODES.STATUS_UNKNOWN,
              message: "Estado indeterminado. Não reenvie automaticamente.",
              clientRequestId,
              retryableMeta: false,
            },
          },
          { status: 409 }
        );
      }
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

    if (!ledger) {
      ledger = await beginOrLoadSendRequest({
        tenantId: auth!.payload.tenantId,
        threadId: thread.id,
        userId: auth!.payload.sub,
        clientRequestId,
        text,
      });
    }

    if (ledger.status === "COMPLETED" && ledger.waMessageId) {
      return NextResponse.json(successPayload(ledger.waMessageId, clientRequestId, true));
    }
    if (ledger.status === "META_ACCEPTED" && ledger.waMessageId) {
      try {
        await waInboxCreateOutbound({
          tenantId: auth!.payload.tenantId,
          businessPhoneNumberId: messagingTenant.phoneNumberId,
          customerPhoneDigits: thread.phoneNumber.replace(/\D/g, ""),
          waMessageId: ledger.waMessageId,
          text,
          businessDigits: digitsOnly(messagingTenant.displayPhoneNumber ?? ""),
        });
        await markSendCompleted(ledger.id, ledger.waMessageId);
        return NextResponse.json(successPayload(ledger.waMessageId, clientRequestId, true));
      } catch (e) {
        await markSendPersistFailed(ledger.id, e instanceof Error ? e.message : String(e));
        return NextResponse.json(
          {
            success: false,
            error: {
              code: SEND_ERROR_CODES.ALREADY_DELIVERED_TO_META,
              message: "Meta aceitou; sync local falhou. Não reenvie.",
              waMessageId: ledger.waMessageId,
              clientRequestId,
              retryableMeta: false,
            },
          },
          { status: 502 }
        );
      }
    }

    if (ledger.status !== "PENDING" && ledger.status !== "FAILED_PRE_META") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SEND_ERROR_CODES.STATUS_UNKNOWN,
            clientRequestId,
            retryableMeta: false,
          },
        },
        { status: 409 }
      );
    }

    const claimed = await claimSendForMeta(ledger.id);
    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SEND_ERROR_CODES.IN_PROGRESS,
            clientRequestId,
            retryableMeta: false,
          },
        },
        { status: 409 }
      );
    }

    const adapter = new WhatsAppCloudAdapter({ accessToken: messagingTenant.accessToken });
    let waMessageId: string;
    try {
      const sent = await adapter.sendText(messagingTenant.phoneNumberId, {
        to: thread.phoneNumber,
        text,
      });
      waMessageId = sent.messageId;
      if (!waMessageId) throw new Error("Meta returned empty message id");
      await markSendMetaAccepted(ledger.id, waMessageId);
    } catch (e) {
      await markSendFailedPreMeta(ledger.id, e instanceof Error ? e.message : String(e));
      throw e;
    }

    try {
      await waInboxCreateOutbound({
        tenantId: auth!.payload.tenantId,
        businessPhoneNumberId: messagingTenant.phoneNumberId,
        customerPhoneDigits: thread.phoneNumber.replace(/\D/g, ""),
        waMessageId,
        text,
        businessDigits: digitsOnly(messagingTenant.displayPhoneNumber ?? ""),
      });
      await markSendCompleted(ledger.id, waMessageId);
    } catch (e) {
      await markSendPersistFailed(ledger.id, e instanceof Error ? e.message : String(e));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SEND_ERROR_CODES.ALREADY_DELIVERED_TO_META,
            message: "Meta aceitou; sync local falhou. Não reenvie.",
            waMessageId,
            clientRequestId,
            retryableMeta: false,
          },
        },
        { status: 502 }
      );
    }

    await logAction(auth!.payload.tenantId, thread.id, auth!.payload.sub, "message_send", {
      source: "admin_conversations_api",
      textLength: text.length,
      clientRequestId,
    });
    recordPlatformAudit({
      action: "admin.conversation.send",
      tenantId: auth!.payload.tenantId,
      userId: auth!.payload.sub,
      resourceType: "wa_inbox_thread",
      resourceId: thread.id,
      metadata: { ip: getClientIp(request), textLength: text.length, clientRequestId },
    });
    logEvent("info", "admin", "conversation_message_sent", {
      tenantId: auth!.payload.tenantId,
      threadId: thread.id,
      userId: auth!.payload.sub,
      clientRequestId,
    });
    return NextResponse.json(successPayload(waMessageId, clientRequestId, false));
  } catch (err) {
    logError("admin", err, { route: "admin_conversation_send", threadId: id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
