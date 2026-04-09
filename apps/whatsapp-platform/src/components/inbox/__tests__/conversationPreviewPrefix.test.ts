import { describe, it, expect } from "vitest";
import { conversationPreviewPrefix } from "../conversationPreviewPrefix";
import type { WaInboxThreadRow } from "../inboxTypes";

function row(p: Partial<WaInboxThreadRow>): WaInboxThreadRow {
  return {
    id: "1",
    phoneNumber: "5511",
    businessPhoneNumberId: "pn",
    contactName: null,
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: "hi",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...p,
  };
}

describe("conversationPreviewPrefix", () => {
  it("Cliente quando não há tipo de última outbound", () => {
    expect(conversationPreviewPrefix(row({ lastResponderType: undefined }))).toBe("Cliente");
  });

  it("IA / Auto / Você conforme lastResponderType", () => {
    expect(conversationPreviewPrefix(row({ lastResponderType: "ai" }))).toBe("IA");
    expect(conversationPreviewPrefix(row({ lastResponderType: "automation" }))).toBe("Auto");
    expect(conversationPreviewPrefix(row({ lastResponderType: "agent" }))).toBe("Você");
  });
});
