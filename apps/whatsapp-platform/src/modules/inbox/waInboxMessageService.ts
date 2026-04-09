import type { Prisma } from "@/generated/prisma-whatsapp";
import {
  WaInboxDeliveryStatus,
  WaInboxDirection,
  WaInboxMsgType,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { digitsOnly, metaTsToDate, previewText } from "./waInboxUtils";
import type { ParsedWaInbound, ParsedWaStatus } from "./waInboxWebhookParser";

function mapMsgType(t: string): WaInboxMsgType {
  switch (t.toLowerCase()) {
    case "text":
      return WaInboxMsgType.TEXT;
    case "image":
      return WaInboxMsgType.IMAGE;
    case "audio":
    case "voice":
      return WaInboxMsgType.AUDIO;
    case "document":
      return WaInboxMsgType.DOCUMENT;
    default:
      return WaInboxMsgType.UNKNOWN;
  }
}

function mapDelivery(s: string): WaInboxDeliveryStatus | null {
  switch (s.toLowerCase()) {
    case "sent":
      return WaInboxDeliveryStatus.SENT;
    case "delivered":
      return WaInboxDeliveryStatus.DELIVERED;
    case "read":
      return WaInboxDeliveryStatus.READ;
    case "failed":
      return WaInboxDeliveryStatus.FAILED;
    default:
      return null;
  }
}

export async function waInboxTenantExists(tenantId: string): Promise<boolean> {
  if (!tenantId || tenantId === "env") return false;
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  return !!t;
}

export async function waInboxCreateInbound(
  tenantId: string,
  businessPhoneNumberId: string,
  p: ParsedWaInbound
): Promise<void> {
  const customer = digitsOnly(p.from);
  const toBiz = p.displayPhone ? digitsOnly(p.displayPhone) : "";
  const ts = metaTsToDate(p.timestamp);
  const mtype = mapMsgType(p.type);
  const textBody =
    mtype === WaInboxMsgType.TEXT && isRecord(p.raw.text)
      ? typeof (p.raw.text as { body?: string }).body === "string"
        ? (p.raw.text as { body: string }).body
        : null
      : null;
  const preview =
    textBody != null ? previewText(textBody) : `[${mtype.toLowerCase()}]`;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.waInboxMessage.findUnique({
      where: { tenantId_waMessageId: { tenantId, waMessageId: p.waMessageId } },
    });
    if (existing) return null;

    const existedThread = await tx.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: customer,
          businessPhoneNumberId,
        },
      },
    });
    const thread = await tx.waInboxThread.upsert({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: customer,
          businessPhoneNumberId,
        },
      },
      create: {
        tenantId,
        phoneNumber: customer,
        businessPhoneNumberId,
        contactName: p.contactName ?? null,
        lastMessageAt: ts,
        lastMessagePreview: preview,
        unreadCount: 1,
        lastCustomerMessageAt: ts,
      },
      update: {
        ...(p.contactName ? { contactName: p.contactName } : {}),
        lastMessageAt: ts,
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
        lastCustomerMessageAt: ts,
      },
    });

    const row = await tx.waInboxMessage.create({
      data: {
        tenantId,
        threadId: thread.id,
        businessPhoneNumberId,
        waMessageId: p.waMessageId,
        direction: WaInboxDirection.INBOUND,
        fromNumber: customer,
        toNumber: toBiz || "0",
        messageType: mtype,
        contentText: textBody,
        contentJson:
          mtype !== WaInboxMsgType.TEXT ? (p.raw as Prisma.InputJsonValue) : undefined,
        ts,
        status: WaInboxDeliveryStatus.RECEIVED,
        rawPayload: p.raw as Prisma.InputJsonValue,
      },
    });

    await tx.waInboxStatusHistory.create({
      data: {
        tenantId,
        messageId: row.id,
        status: WaInboxDeliveryStatus.RECEIVED,
        ts,
        rawPayload: { source: "webhook_inbound" } as Prisma.InputJsonValue,
      },
    });
    return { thread, row, wasNewConversation: !existedThread };
  });
  if (result) {
    const { thread, row, wasNewConversation } = result;
    const { getWaInboxThreadInboxMetrics } = await import("./waInboxThreadMetrics");
    const inboxMetrics = await getWaInboxThreadInboxMetrics(tenantId, thread.id);
    const { publishInboxEvent, eventMessageCreated } = await import("@/modules/realtime/realtime.service");
    publishInboxEvent(tenantId, eventMessageCreated(tenantId, {
      threadId: thread.id,
      message: {
        id: row.id,
        waMessageId: row.waMessageId,
        direction: "INBOUND",
        fromNumber: row.fromNumber,
        toNumber: row.toNumber,
        messageType: row.messageType,
        contentText: row.contentText,
        ts: row.ts.toISOString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      },
      threadPatch: {
        lastMessageAt: thread.lastMessageAt.toISOString(),
        lastMessagePreview: preview,
        unreadCount: thread.unreadCount,
        lastCustomerMessageAt: thread.lastCustomerMessageAt?.toISOString() ?? null,
        lastAgentReplyAt: thread.lastAgentReplyAt?.toISOString() ?? null,
        firstResponseAt: thread.firstResponseAt?.toISOString() ?? null,
        ...(inboxMetrics ?? {}),
      },
    }));
    const { dispatchMessageInbound, dispatchConversationCreated } = await import("@/modules/automation");
    dispatchMessageInbound(tenantId, thread.id, row.id, textBody).catch((e) =>
      console.error("[wa-inbox] automation dispatch inbound", e)
    );
    if (wasNewConversation) {
      dispatchConversationCreated(tenantId, thread.id).catch((e) =>
        console.error("[wa-inbox] automation dispatch conversation_created", e)
      );
    }
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export type WaInboxOutboundKind = "agent" | "ai" | "automation";

export async function waInboxCreateOutbound(params: {
  tenantId: string;
  /** Meta phone_number_id da linha que enviou */
  businessPhoneNumberId: string;
  customerPhoneDigits: string;
  waMessageId: string;
  text: string;
  businessDigits: string;
  /** Origem da mensagem (UI: badge Bot / Automação / Equipa). */
  outboundKind?: WaInboxOutboundKind;
}): Promise<void> {
  const {
    tenantId,
    businessPhoneNumberId,
    customerPhoneDigits,
    waMessageId,
    text,
    businessDigits,
    outboundKind,
  } = params;
  if (!(await waInboxTenantExists(tenantId))) return;

  const ts = new Date();
  const preview = previewText(text);

  const result = await prisma.$transaction(async (tx) => {
    const dup = await tx.waInboxMessage.findUnique({
      where: { tenantId_waMessageId: { tenantId, waMessageId } },
    });
    if (dup) return null;

    const thread = await tx.waInboxThread.upsert({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: customerPhoneDigits,
          businessPhoneNumberId,
        },
      },
      create: {
        tenantId,
        phoneNumber: customerPhoneDigits,
        businessPhoneNumberId,
        lastMessageAt: ts,
        lastMessagePreview: preview,
        unreadCount: 0,
        lastAgentReplyAt: ts,
        firstResponseAt: ts,
      },
      update: {
        lastMessageAt: ts,
        lastMessagePreview: preview,
        lastAgentReplyAt: ts,
      },
    });
    await tx.waInboxThread.updateMany({
      where: { id: thread.id, firstResponseAt: null },
      data: { firstResponseAt: ts },
    });

    const row = await tx.waInboxMessage.create({
      data: {
        tenantId,
        threadId: thread.id,
        businessPhoneNumberId,
        waMessageId,
        direction: WaInboxDirection.OUTBOUND,
        fromNumber: businessDigits || "0",
        toNumber: customerPhoneDigits,
        messageType: WaInboxMsgType.TEXT,
        contentText: text,
        contentJson: outboundKind
          ? ({ outboundKind } as Prisma.InputJsonValue)
          : undefined,
        ts,
        status: WaInboxDeliveryStatus.SENT,
        rawPayload: { text, ...(outboundKind ? { outboundKind } : {}) } as Prisma.InputJsonValue,
      },
    });

    await tx.waInboxStatusHistory.create({
      data: {
        tenantId,
        messageId: row.id,
        status: WaInboxDeliveryStatus.SENT,
        ts,
        rawPayload: { source: "send_api" } as Prisma.InputJsonValue,
      },
    });
    return { thread, row };
  });
  if (result) {
    const { thread, row } = result;
    const { getWaInboxThreadInboxMetrics } = await import("./waInboxThreadMetrics");
    const inboxMetrics = await getWaInboxThreadInboxMetrics(tenantId, thread.id);
    const { publishInboxEvent, eventMessageCreated } = await import("@/modules/realtime/realtime.service");
    publishInboxEvent(tenantId, eventMessageCreated(tenantId, {
      threadId: thread.id,
      message: {
        id: row.id,
        waMessageId: row.waMessageId,
        direction: "OUTBOUND",
        fromNumber: row.fromNumber,
        toNumber: row.toNumber,
        messageType: row.messageType,
        contentText: row.contentText,
        ts: row.ts.toISOString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      },
      threadPatch: {
        lastMessageAt: thread.lastMessageAt.toISOString(),
        lastMessagePreview: preview,
        unreadCount: thread.unreadCount,
        lastCustomerMessageAt: thread.lastCustomerMessageAt?.toISOString() ?? null,
        lastAgentReplyAt: thread.lastAgentReplyAt?.toISOString() ?? null,
        firstResponseAt: thread.firstResponseAt?.toISOString() ?? null,
        ...(inboxMetrics ?? {}),
      },
    }));
    const { dispatchMessageOutbound } = await import("@/modules/automation");
    dispatchMessageOutbound(tenantId, thread.id).catch((e) =>
      console.error("[wa-inbox] automation dispatch outbound", e)
    );
  }
}

export async function waInboxApplyStatus(
  tenantId: string,
  p: ParsedWaStatus
): Promise<boolean> {
  const st = mapDelivery(p.status);
  if (!st) return false;

  const msg = await prisma.waInboxMessage.findUnique({
    where: { tenantId_waMessageId: { tenantId, waMessageId: p.waMessageId } },
  });
  if (!msg) return false;

  const ts = metaTsToDate(p.timestamp);

  await prisma.$transaction(async (tx) => {
    await tx.waInboxMessage.update({
      where: { id: msg.id },
      data: {
        status: st,
        ...(st === WaInboxDeliveryStatus.FAILED
          ? {
              errorCode: "WEBHOOK_STATUS",
              errorMessage: JSON.stringify(p.raw).slice(0, 500),
            }
          : {}),
      },
    });
    await tx.waInboxStatusHistory.create({
      data: {
        tenantId,
        messageId: msg.id,
        status: st,
        ts,
        rawPayload: {
          recipientId: p.recipientId,
          raw: p.raw,
        } as Prisma.InputJsonValue,
      },
    });
  });
  const { publishInboxEvent, eventMessageStatusUpdated } = await import("@/modules/realtime/realtime.service");
  publishInboxEvent(tenantId, eventMessageStatusUpdated(tenantId, {
    threadId: msg.threadId,
    messageId: msg.id,
    status: String(st),
  }));
  return true;
}

export async function waInboxListMessages(
  tenantId: string,
  threadId: string,
  opts: { take?: number; skip?: number }
) {
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
  });
  if (!thread) return null;
  const take = Math.min(opts.take ?? 100, 500);
  const skip = opts.skip ?? 0;
  const messages = await prisma.waInboxMessage.findMany({
    where: { tenantId, threadId },
    orderBy: { ts: "asc" },
    take,
    skip,
  });
  return messages;
}
