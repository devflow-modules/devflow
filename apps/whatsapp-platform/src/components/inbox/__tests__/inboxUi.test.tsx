/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationsList } from "../ConversationsList";
import { MessageBubble } from "../MessageBubble";
import { MessageList } from "../MessageList";
import type { WaInboxMessageRow, WaInboxThreadRow } from "../inboxTypes";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("Inbox UI", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/inbox/conversations/") && url.includes("/messages")) {
          const messages: WaInboxMessageRow[] = [
            {
              id: "m1",
              waMessageId: "w1",
              direction: "INBOUND",
              fromNumber: "5511",
              toNumber: "5513",
              messageType: "TEXT",
              contentText: "Olá",
              contentJson: null,
              ts: new Date().toISOString(),
              status: "RECEIVED",
              errorCode: null,
              errorMessage: null,
              createdAt: new Date().toISOString(),
            },
          ];
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { messages, pagination: {} },
            }),
          });
        }
        if (url.includes("/api/inbox/conversations") && !url.includes("/messages")) {
          const threads: WaInboxThreadRow[] = [
            {
              id: "thread-1",
              phoneNumber: "5511999999999",
              businessPhoneNumberId: "pn-meta-1",
              contactName: "Cliente",
              lastMessageAt: new Date().toISOString(),
              unreadCount: 2,
              lastMessagePreview: "última msg",
              status: "OPEN",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              whatsappLine: {
                phoneNumberId: "pn-meta-1",
                label: "Suporte",
                displayPhoneNumber: "+55 11",
                isPrimary: true,
                isDefaultOutbound: true,
              },
            },
          ];
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { threads, pagination: { total: 1, limit: 100, offset: 0 } },
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza lista de conversas com preview e unread", async () => {
    const onSelect = vi.fn();
    const onFilterChange = vi.fn();
    const onLineFilterChange = vi.fn();
    render(
      <ConversationsList
        selectedId={null}
        onSelect={onSelect}
        filter="all"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={onLineFilterChange}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByTestId("conversations-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("última msg")).toBeInTheDocument();
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("2");
  });

  it("seleciona conversa ao clicar", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onFilterChange = vi.fn();
    const onLineFilterChange = vi.fn();
    render(
      <ConversationsList
        selectedId={null}
        onSelect={onSelect}
        filter="all"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={onLineFilterChange}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => screen.getByTestId("conversation-item"));
    await user.click(screen.getByTestId("conversation-item"));
    expect(onSelect).toHaveBeenCalledWith("thread-1");
  });

  it("MessageList carrega mensagens", async () => {
    render(<MessageList threadId="thread-1" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId("message-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Olá")).toBeInTheDocument();
  });

  it("MessageList mostra loading", () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => {}) as Promise<Response>
    );
    render(<MessageList threadId="thread-1" />, { wrapper: createWrapper() });
    expect(screen.getByTestId("messages-loading")).toBeInTheDocument();
  });

  it("lista vazia (filtro Todas) mostra guia da primeira mensagem", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/inbox/conversations") && !url.includes("/messages")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { threads: [], pagination: { total: 0, limit: 100, offset: 0 } },
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    const onSelect = vi.fn();
    const onFilterChange = vi.fn();
    const onLineFilterChange = vi.fn();
    const lines = [
      {
        phoneNumberId: "pn-1",
        label: null,
        displayPhoneNumber: "+351 910 000 000",
        isPrimary: true,
        isDefaultOutbound: true,
      },
    ];
    render(
      <ConversationsList
        selectedId={null}
        onSelect={onSelect}
        filter="all"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={lines}
        onLineFilterChange={onLineFilterChange}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByTestId("first-conversation-hint")).toBeInTheDocument();
    });
    expect(screen.getByText(/\+351 910 000 000/)).toBeInTheDocument();
  });

  it("MessageBubble outbound mostra status read", () => {
    const msg: WaInboxMessageRow = {
      id: "x",
      waMessageId: "w",
      direction: "OUTBOUND",
      fromNumber: "1",
      toNumber: "2",
      messageType: "TEXT",
      contentText: "Resposta",
      contentJson: null,
      ts: new Date().toISOString(),
      status: "READ",
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    };
    render(<MessageBubble message={msg} />);
    const bubble = screen.getByTestId("message-bubble");
    expect(bubble).toHaveTextContent("Resposta");
    expect(bubble.textContent).toMatch(/✓✓/);
  });
});
