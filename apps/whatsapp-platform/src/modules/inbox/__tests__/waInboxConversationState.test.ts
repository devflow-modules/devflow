import { describe, it, expect } from "vitest";
import {
  computeUnansweredInboundCount,
  deriveConversationState,
  inboxListSortRank,
  lastResponderTypeFromLastMessage,
  threadSidebarSection,
} from "../waInboxConversationState";

function d(iso: string): Date {
  return new Date(iso);
}

describe("computeUnansweredInboundCount", () => {
  it("sem outbound conta todas as inbound", () => {
    expect(
      computeUnansweredInboundCount([
        { direction: "INBOUND", ts: d("2025-01-01T10:00:00Z") },
        { direction: "INBOUND", ts: d("2025-01-01T10:01:00Z") },
      ])
    ).toBe(2);
  });

  it("várias inbound sem resposta após último outbound", () => {
    expect(
      computeUnansweredInboundCount([
        { direction: "INBOUND", ts: d("2025-01-01T10:00:00Z") },
        { direction: "OUTBOUND", ts: d("2025-01-01T10:05:00Z") },
        { direction: "INBOUND", ts: d("2025-01-01T10:06:00Z") },
        { direction: "INBOUND", ts: d("2025-01-01T10:07:00Z") },
      ])
    ).toBe(2);
  });

  it("resposta outbound zera contador até nova inbound", () => {
    expect(
      computeUnansweredInboundCount([
        { direction: "INBOUND", ts: d("2025-01-01T10:00:00Z") },
        { direction: "OUTBOUND", ts: d("2025-01-01T10:05:00Z") },
      ])
    ).toBe(0);
  });

  it("nova inbound após outbound reabre contador", () => {
    expect(
      computeUnansweredInboundCount([
        { direction: "OUTBOUND", ts: d("2025-01-01T10:05:00Z") },
        { direction: "INBOUND", ts: d("2025-01-01T10:10:00Z") },
      ])
    ).toBe(1);
  });
});

describe("deriveConversationState + inboxListSortRank", () => {
  it("fechada prevalece", () => {
    expect(
      deriveConversationState({
        threadStatus: "CLOSED",
        assignedToUserId: "u1",
        unansweredInboundCount: 5,
      })
    ).toBe("closed");
  });

  it("pendência inbound prevalece sobre atribuição", () => {
    expect(
      deriveConversationState({
        threadStatus: "OPEN",
        assignedToUserId: "u1",
        unansweredInboundCount: 1,
      })
    ).toBe("awaiting_agent");
  });

  it("ordenação: awaiting_agent antes de awaiting_customer (mesmo lastMessageAt irrelevante no rank)", () => {
    const a = {
      threadStatus: "OPEN",
      assignedToUserId: null as string | null,
      unansweredInboundCount: 0,
    };
    const b = {
      threadStatus: "OPEN",
      assignedToUserId: null as string | null,
      unansweredInboundCount: 1,
    };
    expect(inboxListSortRank(b) < inboxListSortRank(a)).toBe(true);
  });

  it("in_progress entre awaiting_agent e awaiting_customer", () => {
    const awaitingCustomer = {
      threadStatus: "OPEN",
      assignedToUserId: null,
      unansweredInboundCount: 0,
    };
    const inProgress = {
      threadStatus: "OPEN",
      assignedToUserId: "x",
      unansweredInboundCount: 0,
    };
    expect(inboxListSortRank({ ...inProgress })).toBe(1);
    expect(inboxListSortRank({ ...awaitingCustomer })).toBe(2);
  });
});

describe("lastResponderTypeFromLastMessage", () => {
  it("última outbound IA", () => {
    expect(
      lastResponderTypeFromLastMessage("OUTBOUND", { outboundKind: "ai" })
    ).toBe("ai");
  });

  it("última inbound não tem responder", () => {
    expect(lastResponderTypeFromLastMessage("INBOUND", {})).toBe(null);
  });
});

describe("threadSidebarSection", () => {
  it("prioriza awaiting_agent sobre sem dono", () => {
    expect(
      threadSidebarSection({
        conversationState: "awaiting_agent",
        status: "OPEN",
        unansweredInboundCount: 1,
        assignedToUser: null,
        isUnassigned: true,
      })
    ).toBe("awaiting_agent");
  });

  it("aguardando cliente (ex.: IA respondeu) vai para secção Aguardando cliente, não Sem dono", () => {
    expect(
      threadSidebarSection({
        conversationState: "awaiting_customer",
        status: "OPEN",
        unansweredInboundCount: 0,
        assignedToUser: null,
        isUnassigned: true,
      })
    ).toBe("awaiting_customer");
  });

  it("aguardando cliente com responsável vai para a secção correspondente", () => {
    expect(
      threadSidebarSection({
        conversationState: "awaiting_customer",
        status: "OPEN",
        unansweredInboundCount: 0,
        assignedToUser: { id: "u1" },
        isUnassigned: false,
      })
    ).toBe("awaiting_customer");
  });
});
