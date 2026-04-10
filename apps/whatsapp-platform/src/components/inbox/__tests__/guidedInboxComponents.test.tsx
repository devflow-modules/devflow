/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversationActionBanner } from "../ConversationActionBanner";
import { ConversationTimeline } from "../ConversationTimeline";
import { OperatorSuggestion } from "../OperatorSuggestion";
import type { WaInboxMessageRow, WaInboxThreadRow } from "../inboxTypes";

describe("guided inbox components", () => {
  it("ConversationActionBanner mostra texto para HIGH em espera", () => {
    const thread: WaInboxThreadRow = {
      id: "t1",
      phoneNumber: "5511",
      businessPhoneNumberId: "pn",
      contactName: "Ana",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 1,
      lastMessagePreview: "Oi",
      status: "OPEN",
      priority: "HIGH",
      conversationState: "awaiting_agent",
      lastUnansweredInboundAt: new Date(Date.now() - 8 * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    render(
      <ConversationActionBanner
        thread={thread}
        dismissed={false}
        onDismiss={vi.fn()}
        onRespondNow={vi.fn()}
      />
    );
    expect(screen.getByTestId("conversation-action-banner")).toBeInTheDocument();
    expect(screen.getByText(/Lead HIGH aguardando resposta/)).toBeInTheDocument();
  });

  it("ConversationTimeline renderiza resumo quando há mensagens suficientes", () => {
    const messages: WaInboxMessageRow[] = [
      {
        id: "m1",
        waMessageId: "w1",
        direction: "INBOUND",
        fromNumber: "1",
        toNumber: "2",
        messageType: "TEXT",
        contentText: "Olá",
        contentJson: null,
        ts: "2026-04-09T10:00:00.000Z",
        status: "RECEIVED",
        errorCode: null,
        errorMessage: null,
        createdAt: "2026-04-09T10:00:00.000Z",
      },
      {
        id: "m2",
        waMessageId: "w2",
        direction: "OUTBOUND",
        fromNumber: "2",
        toNumber: "1",
        messageType: "TEXT",
        contentText: "Oi!",
        contentJson: { outboundKind: "ai" },
        ts: "2026-04-09T10:00:30.000Z",
        status: "SENT",
        errorCode: null,
        errorMessage: null,
        createdAt: "2026-04-09T10:00:30.000Z",
      },
    ];
    render(<ConversationTimeline messages={messages} />);
    expect(screen.getByTestId("conversation-timeline")).toBeInTheDocument();
  });

  it("OperatorSuggestion mostra texto gerado", () => {
    const thread: WaInboxThreadRow = {
      id: "t1",
      phoneNumber: "5511",
      businessPhoneNumberId: "pn",
      contactName: "Ana",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: null,
      status: "OPEN",
      aiState: "qualifying",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    render(<OperatorSuggestion thread={thread} />);
    expect(screen.getByTestId("operator-suggestion")).toBeInTheDocument();
    expect(screen.getByText(/Sugestão/)).toBeInTheDocument();
  });
});
