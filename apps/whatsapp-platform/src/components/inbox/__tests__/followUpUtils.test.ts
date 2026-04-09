import { describe, it, expect } from "vitest";
import { followUpSuggestion, FOLLOW_UP_MIN_DELAY_MS } from "../followUpUtils";
import type { WaInboxThreadRow } from "../inboxTypes";

function baseThread(over: Partial<WaInboxThreadRow>): WaInboxThreadRow {
  return {
    id: "t1",
    phoneNumber: "5511",
    businessPhoneNumberId: "pn",
    contactName: null,
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: null,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe("followUpSuggestion", () => {
  it("não mostra se não for awaiting_customer", () => {
    const t = baseThread({
      conversationState: "awaiting_agent",
      lastAgentReplyAt: new Date(Date.now() - 999 * 60 * 60 * 1000).toISOString(),
    });
    expect(followUpSuggestion(t)).toBeNull();
  });

  it("não mostra antes do delay mínimo", () => {
    const last = new Date("2026-04-09T10:00:00.000Z").getTime();
    const now = last + FOLLOW_UP_MIN_DELAY_MS - 60_000;
    const t = baseThread({
      conversationState: "awaiting_customer",
      lastAgentReplyAt: new Date(last).toISOString(),
    });
    const r = followUpSuggestion(t, now);
    expect(r).not.toBeNull();
    expect(r!.show).toBe(false);
  });

  it("mostra após o delay mínimo desde lastAgentReplyAt", () => {
    const last = new Date("2026-04-09T10:00:00.000Z").getTime();
    const now = last + FOLLOW_UP_MIN_DELAY_MS + 1000;
    const t = baseThread({
      conversationState: "awaiting_customer",
      lastAgentReplyAt: new Date(last).toISOString(),
    });
    const r = followUpSuggestion(t, now);
    expect(r).not.toBeNull();
    expect(r!.show).toBe(true);
    expect(r!.suggestedText.length).toBeGreaterThan(10);
  });
});
