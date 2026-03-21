import { describe, expect, it, vi } from "vitest";
import {
  findOrCreateConversationForInbound,
  touchConversationAfterOutbound,
} from "../whatsappInbox.conversation.service";

describe("conversation.service", () => {
  it("findOrCreateConversationForInbound cria quando ausente", async () => {
    const tx = {
      whatsappConversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "c1", phoneNumber: "5511" }),
      },
    };
    await findOrCreateConversationForInbound(tx as never, {
      phoneNumber: "5511",
      contactName: "João",
      lastMessageAt: new Date(),
      lastMessagePreview: "oi",
    });
    expect(tx.whatsappConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNumber: "5511", unreadCount: 1 }),
      })
    );
  });

  it("findOrCreateConversationForInbound incrementa unread quando existe", async () => {
    const tx = {
      whatsappConversation: {
        findUnique: vi.fn().mockResolvedValue({ id: "c1", phoneNumber: "5511" }),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn(),
      },
    };
    await findOrCreateConversationForInbound(tx as never, {
      phoneNumber: "5511",
      lastMessageAt: new Date(),
      lastMessagePreview: "b",
    });
    expect(tx.whatsappConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unreadCount: { increment: 1 } }),
      })
    );
    expect(tx.whatsappConversation.create).not.toHaveBeenCalled();
  });

  it("touchConversationAfterOutbound upsert", async () => {
    const tx = {
      whatsappConversation: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    await touchConversationAfterOutbound(tx as never, {
      customerPhone: "5511",
      lastMessageAt: new Date(),
      lastMessagePreview: "reply",
    });
    expect(tx.whatsappConversation.upsert).toHaveBeenCalled();
  });
});
