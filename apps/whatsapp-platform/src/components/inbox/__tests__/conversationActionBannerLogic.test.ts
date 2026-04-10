import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeConversationActionBanner, bannerLabel } from "../conversationActionBannerLogic";
import type { WaInboxThreadRow } from "../inboxTypes";

function baseThread(over: Partial<WaInboxThreadRow>): WaInboxThreadRow {
  const now = new Date("2026-04-09T12:00:00.000Z");
  return {
    id: "t1",
    phoneNumber: "5511",
    businessPhoneNumberId: "pn1",
    contactName: "X",
    lastMessageAt: now.toISOString(),
    unreadCount: 0,
    lastMessagePreview: "hi",
    status: "OPEN",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...over,
  };
}

describe("computeConversationActionBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("HIGH + awaiting_agent → high_wait com minutos desde última inbound pendente", () => {
    const t = baseThread({
      priority: "HIGH",
      conversationState: "awaiting_agent",
      lastUnansweredInboundAt: new Date("2026-04-09T11:52:00.000Z").toISOString(),
    });
    const v = computeConversationActionBanner(t);
    expect(v).toEqual({ kind: "high_wait", minutes: 8 });
    expect(bannerLabel(v)).toContain("Lead HIGH");
    expect(bannerLabel(v)).toContain("8 min");
  });

  it("negotiating + silêncio ≥30 min + sem awaiting_agent → negotiation_stalled", () => {
    const t = baseThread({
      aiState: "negotiating",
      conversationState: "awaiting_customer",
      lastMessageAt: new Date("2026-04-09T11:25:00.000Z").toISOString(),
    });
    const v = computeConversationActionBanner(t);
    expect(v).toEqual({ kind: "negotiation_stalled", minutes: 35 });
  });

  it("awaiting_agent sem HIGH → customer_waiting", () => {
    const t = baseThread({
      priority: "MEDIUM",
      conversationState: "awaiting_agent",
      lastUnansweredInboundAt: new Date("2026-04-09T11:59:00.000Z").toISOString(),
    });
    const v = computeConversationActionBanner(t);
    expect(v).toEqual({ kind: "customer_waiting" });
  });
});
