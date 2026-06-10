/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationsList } from "../ConversationsList";
import { MessageBubble } from "../MessageBubble";
import { MessageList } from "../MessageList";
import { ChatWindow } from "../ChatWindow";
import { MessageInput } from "../MessageInput";
import { ChatHeader } from "../ChatHeader";
import { InternalNotesPanel } from "../InternalNotesPanel";
import type { WaInboxMessageRow, WaInboxThreadRow } from "../inboxTypes";
import { SupportProvider } from "@/components/support/SupportProvider";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <SupportProvider>{children}</SupportProvider>
      </QueryClientProvider>
    );
  };
}

describe("Inbox UI", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/whatsapp/phone-numbers")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: [
                {
                  phoneNumberId: "pn-meta-1",
                  label: "Suporte",
                  displayPhoneNumber: "+55 11",
                  isPrimary: true,
                  isDefaultOutbound: true,
                  status: "ACTIVE",
                },
              ],
            }),
          });
        }
        if (url.includes("/api/inbox/conversations/") && url.includes("/send") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as Response);
        }
        if (url.includes("/api/inbox/tags")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { tags: [{ id: "tag-1", name: "VIP", color: "#ef4444" }] } }),
          });
        }
        if (url.includes("/api/inbox/users")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { users: [{ id: "u1", name: "Agente", email: "a@x.com" }] },
            }),
          });
        }
        if (url.includes("/api/queues")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { queues: [] } }),
          });
        }
        if (url.includes("/internal-notes")) {
          if (init?.method === "DELETE") {
            return Promise.resolve({
              ok: true,
              json: async () => ({ success: true, data: { deleted: true } }),
            });
          }
          if (init?.method === "POST") {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  note: {
                    id: "n1",
                    body: "Lembrete",
                    userId: "u1",
                    authorName: "Agente",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
              }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { notes: [] } }),
          });
        }
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
        if (url.includes("/view") || url.includes("/typing")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as Response);
        }
        const singleThreadMatch = url.match(/\/api\/inbox\/conversations\/([^/?]+)\/?$/);
        if (singleThreadMatch && !url.includes("/messages")) {
          const id = singleThreadMatch[1];
          const row: WaInboxThreadRow = {
            id,
            phoneNumber: "5511999999999",
            businessPhoneNumberId: "pn-meta-1",
            contactName: "Cliente",
            lastMessageAt: new Date().toISOString(),
            unreadCount: 2,
            unansweredInboundCount: 2,
            conversationState: "awaiting_agent",
            lastResponderType: null,
            responseDelayMs: 120_000,
            slaLevel: "medium",
            isUnassigned: true,
            isAssignedToMe: false,
            lastUnansweredInboundAt: new Date().toISOString(),
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
              status: "ACTIVE",
              purpose: "SUPPORT",
            },
          };
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { thread: row } }),
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
              unansweredInboundCount: 2,
              conversationState: "awaiting_agent",
              lastResponderType: null,
              responseDelayMs: 120_000,
              slaLevel: "low",
              isUnassigned: true,
              isAssignedToMe: false,
              lastUnansweredInboundAt: new Date().toISOString(),
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
                status: "ACTIVE",
                purpose: "SUPPORT",
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

  afterEach(async () => {
    cleanup();
    await Promise.resolve();
    await new Promise<void>((r) => queueMicrotask(r));
    vi.unstubAllGlobals();
  });

  it("renderiza lista de conversas com preview e badge de pendências inbound", async () => {
    const onSelect = vi.fn();
    const onFilterChange = vi.fn();
    const onLineFilterChange = vi.fn();
    render(
      <ConversationsList
        selectedId={null}
        onSelect={onSelect}
        filter="needs_response"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={onLineFilterChange}
        queueFilter={null}
        queues={[]}
        onQueueFilterChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByTestId("conversations-list")).toBeInTheDocument();
    });
    const row = screen.getByTestId("conversation-item");
    expect(within(row).getAllByText("Cliente").length).toBeGreaterThanOrEqual(1);
    expect(within(row).getByText("última msg")).toBeInTheDocument();
    expect(screen.getByTestId("pending-inbound-badge")).toHaveTextContent("2");
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
        filter="needs_response"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={onLineFilterChange}
        queueFilter={null}
        queues={[]}
        onQueueFilterChange={vi.fn()}
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

  it("lista vazia sem threads no tenant mostra guia da primeira mensagem", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/inbox/conversations") && !url.includes("/messages")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { threads: [], pagination: { total: 0, limit: 100, offset: 0 } },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
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
        status: "ACTIVE",
        purpose: "GENERAL",
      },
    ];
    render(
      <ConversationsList
        selectedId={null}
        onSelect={onSelect}
        filter="needs_response"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={lines}
        onLineFilterChange={onLineFilterChange}
        queueFilter={null}
        queues={[]}
        onQueueFilterChange={vi.fn()}
        tenantThreadTotal={0}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByTestId("first-conversation-hint")).toBeInTheDocument();
    });
    expect(screen.getByText(/\+351 910 000 000/)).toBeInTheDocument();
  });

  it("ChatHeader mostra tags da thread", async () => {
    const thread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "pn-meta-1",
      contactName: "Cliente",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: "x",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      threadTags: [{ tag: { id: "tag-1", name: "VIP", color: "#ef4444" } }],
    };
    render(
      <ChatHeader threadId="thread-1" thread={thread} onAuditTabChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByTestId("chat-thread-tags")).toHaveTextContent("VIP");
    });
  });

  it("InternalNotesPanel carrega notas da API", async () => {
    render(<InternalNotesPanel threadId="thread-1" onClose={vi.fn()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Ainda não há notas/)).toBeInTheDocument();
    });
  });

  it("ChatWindow mostra badge de SLA no header", async () => {
    const thread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "pn-meta-1",
      contactName: "Cliente",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 1,
      unansweredInboundCount: 1,
      conversationState: "awaiting_agent",
      lastResponderType: null,
      responseDelayMs: 60_000,
      slaLevel: "medium",
      isUnassigned: false,
      isAssignedToMe: true,
      lastUnansweredInboundAt: new Date().toISOString(),
      lastMessagePreview: "hi",
      status: "OPEN",
      assignedToUser: { id: "u1", name: "Agente", email: "a@x.com" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    render(<ChatWindow threadId="thread-1" thread={thread} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId("chat-header-sla")).toBeInTheDocument();
    });
  });

  it("MessageInput aplica template rápido ao clicar", async () => {
    const user = userEvent.setup();
    render(<MessageInput threadId="thread-1" thread={null} />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId("template-Saudação"));
    const ta = screen.getByPlaceholderText("Escreva a mensagem…") as HTMLTextAreaElement;
    expect(ta.value).toContain("Olá! Obrigado pelo contacto");
  });

  it("MessageInput mostra banner de follow-up quando awaiting_customer e passou o delay", () => {
    const thread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511",
      businessPhoneNumberId: "pn",
      contactName: null,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: "x",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationState: "awaiting_customer",
      lastAgentReplyAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    };
    render(<MessageInput threadId="thread-1" thread={thread} />, { wrapper: createWrapper() });
    expect(screen.getByTestId("follow-up-banner")).toBeInTheDocument();
  });

  it("MessageInput mostra preview do playbook após Sugerir ação", async () => {
    const user = userEvent.setup();
    const orig = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("suggest-playbook")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              intent: "Dúvida sobre prazo",
              recommendedAction: "Confirmar datas com o cliente.",
              suggestedResponse: "Olá! Confirmando: o prazo é até sexta.",
              tokensUsed: 10,
              durationMs: 100,
            },
          }),
        } as Response);
      }
      return orig!(input, init);
    });
    render(<MessageInput threadId="thread-1" />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId("btn-playbook-suggest"));
    await waitFor(() => {
      expect(screen.getByTestId("playbook-preview")).toHaveTextContent("Dúvida sobre prazo");
    });
  });

  it("MessageInput mostra pré-visualização após gerar com IA", async () => {
    const user = userEvent.setup();
    const orig = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("suggest-reply")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { text: "Resposta sugerida pela IA" } }),
        } as Response);
      }
      return orig!(input, init);
    });
    render(<MessageInput threadId="thread-1" />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId("btn-ai-suggest"));
    await waitFor(() => {
      expect(screen.getByTestId("ai-preview")).toHaveTextContent("Resposta sugerida pela IA");
    });
  });

  it("MessageInput envia resposta: POST /send e optimista na thread", async () => {
    const user = userEvent.setup();
    render(<MessageInput threadId="thread-1" thread={null} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Escreva a mensagem…")).toBeInTheDocument();
    });
    const ta = screen.getByPlaceholderText("Escreva a mensagem…");
    await user.type(ta, "Resposta do agente");
    await user.click(screen.getByTestId("send-button"));
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/inbox/conversations/thread-1/send"),
        expect.objectContaining({ method: "POST" })
      );
    });
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
    expect(bubble).toHaveTextContent("Lida");
    expect(bubble.textContent).toMatch(/✓✓/);
  });
});
