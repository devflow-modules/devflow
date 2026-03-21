import type { Prisma } from "@prisma/client";
import type { PrismaRoot } from "./whatsappInbox.conversation.service";

/** Enums do schema root (evita import de @prisma/client na Vercel). */
const WhatsappInboxDeliveryStatus = {
  RECEIVED: "RECEIVED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
} as const;
const WhatsappInboxDirection = { INBOUND: "INBOUND", OUTBOUND: "OUTBOUND" } as const;
const WhatsappInboxMessageType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  DOCUMENT: "DOCUMENT",
  UNKNOWN: "UNKNOWN",
} as const;
type WhatsappInboxDeliveryStatus = (typeof WhatsappInboxDeliveryStatus)[keyof typeof WhatsappInboxDeliveryStatus];
type WhatsappInboxDirection = (typeof WhatsappInboxDirection)[keyof typeof WhatsappInboxDirection];
type WhatsappInboxMessageType = (typeof WhatsappInboxMessageType)[keyof typeof WhatsappInboxMessageType];
import type { ParsedMessageEvent, ParsedStatusEvent } from "@/modules/whatsapp-webhook/whatsappWebhook.types";
import {
  findOrCreateConversationForInbound,
  touchConversationAfterOutbound,
} from "./whatsappInbox.conversation.service";
import { inboxLog } from "./whatsappInbox.logger";
import { metaTimestampToDate, normalizeWaPhone, previewText } from "./whatsappInbox.utils";

function mapMessageType(t: string | undefined): WhatsappInboxMessageType {
  switch ((t ?? "").toLowerCase()) {
    case "text":
      return WhatsappInboxMessageType.TEXT;
    case "image":
      return WhatsappInboxMessageType.IMAGE;
    case "audio":
    case "voice":
      return WhatsappInboxMessageType.AUDIO;
    case "document":
      return WhatsappInboxMessageType.DOCUMENT;
    default:
      return WhatsappInboxMessageType.UNKNOWN;
  }
}

function mapMetaStatusToDelivery(
  s: string | undefined
): WhatsappInboxDeliveryStatus | null {
  switch ((s ?? "").toLowerCase()) {
    case "sent":
      return WhatsappInboxDeliveryStatus.SENT;
    case "delivered":
      return WhatsappInboxDeliveryStatus.DELIVERED;
    case "read":
      return WhatsappInboxDeliveryStatus.READ;
    case "failed":
      return WhatsappInboxDeliveryStatus.FAILED;
    default:
      return null;
  }
}

function businessToNumber(metadata?: ParsedMessageEvent["metadata"]): string {
  const display = metadata?.display_phone_number;
  if (display) return normalizeWaPhone(display);
  const fromEnv =
    process.env.WHATSAPP_BUSINESS_E164 || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const n = normalizeWaPhone(fromEnv);
  return n || "0";
}

export async function createInboundMessage(
  prisma: PrismaRoot,
  ev: ParsedMessageEvent
): Promise<{ skipped: boolean; reason?: string }> {
  if (ev.field === "smb_message_echoes") {
    return { skipped: true, reason: "echo_not_persisted" };
  }

  const waMessageId = ev.messageId;
  const from = ev.from;
  if (!waMessageId || !from) {
    return { skipped: true, reason: "missing_wa_message_id_or_from" };
  }

  try {
    await prisma.$transaction(async (tx: PrismaRoot) => {
      const existing = await tx.whatsappInboxMessage.findUnique({
        where: { waMessageId },
      });
      if (existing) {
        return;
      }

      const customerPhone = normalizeWaPhone(from);
      const toBiz = businessToNumber(ev.metadata);
      const ts = metaTimestampToDate(ev.timestamp);
      const mtype = mapMessageType(ev.type);
      const textBody =
        mtype === WhatsappInboxMessageType.TEXT && ev.rawMessage.text?.body
          ? ev.rawMessage.text.body
          : null;
      const preview =
        textBody != null
          ? previewText(textBody)
          : `[${mtype.toLowerCase()}]`;

      const conv = await findOrCreateConversationForInbound(tx, {
        phoneNumber: customerPhone,
        contactName: ev.contactName,
        lastMessageAt: ts,
        lastMessagePreview: preview,
      });

      const row = await tx.whatsappInboxMessage.create({
        data: {
          conversationId: conv.id,
          waMessageId,
          direction: WhatsappInboxDirection.INBOUND,
          fromNumber: customerPhone,
          toNumber: toBiz,
          messageType: mtype,
          contentText: textBody,
          contentJson:
            mtype !== WhatsappInboxMessageType.TEXT
              ? (ev.rawMessage as Prisma.InputJsonValue)
              : undefined,
          ts,
          status: WhatsappInboxDeliveryStatus.RECEIVED,
          rawPayload: ev.rawMessage as Prisma.InputJsonValue,
        },
      });

      await tx.whatsappMessageStatusHistory.create({
        data: {
          messageId: row.id,
          status: WhatsappInboxDeliveryStatus.RECEIVED,
          ts,
          rawPayload: { source: "webhook_inbound" } as Prisma.InputJsonValue,
        },
      });
    });

    inboxLog("inbound_persisted", { waMessageIdMasked: maskId(waMessageId) });
    return { skipped: false };
  } catch (e) {
    inboxLog("inbound_persist_error", {
      err: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

function maskId(id: string): string {
  return id.length > 12 ? id.slice(0, 6) + "…" + id.slice(-4) : "***";
}

export async function createOutboundMessage(
  prisma: PrismaRoot,
  params: {
    waMessageId: string;
    toE164: string;
    text: string;
    rawPayload?: Prisma.InputJsonValue;
  }
): Promise<void> {
  const { waMessageId, toE164, text, rawPayload } = params;
  const customerPhone = normalizeWaPhone(toE164);
  const fromBiz =
    normalizeWaPhone(
      process.env.WHATSAPP_BUSINESS_E164 || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""
    ) || "0";
  const ts = new Date();
  const preview = previewText(text);

  await prisma.$transaction(async (tx: PrismaRoot) => {
    const existing = await tx.whatsappInboxMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      return;
    }

    await touchConversationAfterOutbound(tx, {
      customerPhone,
      lastMessageAt: ts,
      lastMessagePreview: preview,
    });

    const conv = await tx.whatsappConversation.findUniqueOrThrow({
      where: { phoneNumber: customerPhone },
    });

    const row = await tx.whatsappInboxMessage.create({
      data: {
        conversationId: conv.id,
        waMessageId,
        direction: WhatsappInboxDirection.OUTBOUND,
        fromNumber: fromBiz,
        toNumber: customerPhone,
        messageType: WhatsappInboxMessageType.TEXT,
        contentText: text,
        ts,
        status: WhatsappInboxDeliveryStatus.SENT,
        rawPayload: (rawPayload ?? { text }) as Prisma.InputJsonValue,
      },
    });

    await tx.whatsappMessageStatusHistory.create({
      data: {
        messageId: row.id,
        status: WhatsappInboxDeliveryStatus.SENT,
        ts,
        rawPayload: { source: "send_api" } as Prisma.InputJsonValue,
      },
    });
  });

  inboxLog("outbound_persisted", { waMessageIdMasked: maskId(waMessageId) });
}

export async function updateMessageStatusFromWebhook(
  prisma: PrismaRoot,
  ev: ParsedStatusEvent
): Promise<{ applied: boolean }> {
  const waMessageId = ev.messageId;
  const st = mapMetaStatusToDelivery(ev.status);
  if (!waMessageId || !st) {
    return { applied: false };
  }

  const ts = metaTimestampToDate(ev.timestamp);
  const raw = {
    recipientId: ev.recipientId,
    status: ev.status,
    rawStatus: ev.rawStatus,
  } as Prisma.InputJsonValue;

  try {
    const msg = await prisma.whatsappInboxMessage.findUnique({
      where: { waMessageId },
    });
    if (!msg) {
      inboxLog("status_no_message", { waMessageIdMasked: maskId(waMessageId), status: ev.status });
      return { applied: false };
    }

    await prisma.$transaction(async (tx: PrismaRoot) => {
      await tx.whatsappInboxMessage.update({
        where: { id: msg.id },
        data: {
          status: st,
          ...(st === WhatsappInboxDeliveryStatus.FAILED
            ? {
                errorCode: "WEBHOOK_STATUS_FAILED",
                errorMessage:
                  JSON.stringify(ev.rawStatus).slice(0, 500) || null,
              }
            : {}),
        },
      });
      await tx.whatsappMessageStatusHistory.create({
        data: {
          messageId: msg.id,
          status: st,
          ts,
          rawPayload: raw,
        },
      });
    });

    inboxLog("status_applied", {
      waMessageIdMasked: maskId(waMessageId),
      status: st,
    });
    return { applied: true };
  } catch (e) {
    inboxLog("status_error", {
      err: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

export async function listMessagesForConversation(
  prisma: PrismaRoot,
  conversationId: string,
  opts: { take?: number; skip?: number } = {}
) {
  const take = Math.min(opts.take ?? 100, 500);
  const skip = opts.skip ?? 0;
  return prisma.whatsappInboxMessage.findMany({
    where: { conversationId },
    orderBy: { ts: "asc" },
    take,
    skip,
  });
}
