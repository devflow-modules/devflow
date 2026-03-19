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

  await prisma.$transaction(async (tx) => {
    const existing = await tx.waInboxMessage.findUnique({
      where: { tenantId_waMessageId: { tenantId, waMessageId: p.waMessageId } },
    });
    if (existing) return;

    const thread = await tx.waInboxThread.upsert({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber: customer } },
      create: {
        tenantId,
        phoneNumber: customer,
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
  });
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export async function waInboxCreateOutbound(params: {
  tenantId: string;
  customerPhoneDigits: string;
  waMessageId: string;
  text: string;
  businessDigits: string;
}): Promise<void> {
  const { tenantId, customerPhoneDigits, waMessageId, text, businessDigits } = params;
  if (!(await waInboxTenantExists(tenantId))) return;

  const ts = new Date();
  const preview = previewText(text);

  await prisma.$transaction(async (tx) => {
    const dup = await tx.waInboxMessage.findUnique({
      where: { tenantId_waMessageId: { tenantId, waMessageId } },
    });
    if (dup) return;

    const thread = await tx.waInboxThread.upsert({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber: customerPhoneDigits } },
      create: {
        tenantId,
        phoneNumber: customerPhoneDigits,
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
        waMessageId,
        direction: WaInboxDirection.OUTBOUND,
        fromNumber: businessDigits || "0",
        toNumber: customerPhoneDigits,
        messageType: WaInboxMsgType.TEXT,
        contentText: text,
        ts,
        status: WaInboxDeliveryStatus.SENT,
        rawPayload: { text } as Prisma.InputJsonValue,
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
  });
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
