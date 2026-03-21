import { describe, expect, it, vi, beforeEach } from "vitest";
import { createInboundMessage, updateMessageStatusFromWebhook } from "../whatsappInbox.message.service";
import type { ParsedMessageEvent, ParsedStatusEvent } from "@/modules/whatsapp-webhook/whatsappWebhook.types";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  whatsappInboxMessage: { findUnique: vi.fn() },
}));

vi.mock("@/modules/financeiro/lib/db", () => ({
  prisma: prismaMock,
}));

describe("message.service", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    prismaMock.whatsappInboxMessage.findUnique.mockReset();
  });

  it("createInboundMessage skip sem messageId", async () => {
    const ev = {
      kind: "message" as const,
      object: "whatsapp_business_account",
      field: "messages",
      rawMessage: {},
    } as ParsedMessageEvent;
    const r = await createInboundMessage(prismaMock as never, ev);
    expect(r.skipped).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("createInboundMessage skip smb_message_echoes", async () => {
    const ev = {
      kind: "message" as const,
      object: "x",
      field: "smb_message_echoes",
      messageId: "w1",
      from: "5511",
      rawMessage: { id: "w1", from: "5511", type: "text", text: { body: "x" } },
    } as ParsedMessageEvent;
    const r = await createInboundMessage(prismaMock as never, ev);
    expect(r.skipped).toBe(true);
  });

  it("updateMessageStatusFromWebhook applied false sem message na base", async () => {
    prismaMock.whatsappInboxMessage.findUnique.mockResolvedValue(null);
    const ev: ParsedStatusEvent = {
      kind: "status",
      object: "waba",
      field: "messages",
      messageId: "unknown_wamid",
      status: "delivered",
      rawStatus: {},
    };
    const r = await updateMessageStatusFromWebhook(prismaMock as never, ev);
    expect(r.applied).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
