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
import { INBOX_QK, type WaInboxMessageRow, type WaInboxThreadRow } from "../inboxTypes";
import { SupportProvider } from "@/components/support/SupportProvider";
import { SessionRoleProvider } from "@/components/navigation/SessionRoleContext";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function createWrapper(qc = createQueryClient()) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <SessionRoleProvider>
          <SupportProvider>{children}</SupportProvider>
        </SessionRoleProvider>
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
        if (url.includes("/api/auth/verify")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                valid: true,
                user: { id: "u1", role: "operator", name: "Agente", tenantId: "tenant-1" },
              },
            }),
          } as Response);
        }
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
          const body = JSON.parse(String(init.body ?? "{}")) as { clientRequestId?: string };
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                waMessageId: "wamid.default-send",
                clientRequestId: body.clientRequestId ?? "cr-default",
                status: "sent",
                replayed: false,
              },
            }),
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
    // Fatia 1 — densificação: CRM/score fora da row; unread+pending e assignee preservados
    expect(within(row).queryByTestId("crm-inbox-row")).not.toBeInTheDocument();
    expect(within(row).queryByTestId("lead-score-list")).not.toBeInTheDocument();
    expect(within(row).queryByTestId("whatsapp-line-badge")).not.toBeInTheDocument();
    expect(within(row).queryByTestId("response-alert-badge")).not.toBeInTheDocument();
    expect(within(row).getByTestId("assignee-line")).toHaveTextContent(/Sem responsável/i);
    expect(within(row).getByTestId("conversation-state-badge")).toHaveTextContent(/Precisa resposta/i);
    expect(within(row).getByTestId("unread-count-badge")).toHaveTextContent("2");
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

  it("MessageList mostra erro acessível e retry recupera para o estado vazio", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let messageRequests = 0;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/inbox/conversations/thread-1/messages")) {
        messageRequests += 1;
        if (messageRequests === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: "Falha temporária" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { messages: [], pagination: {} },
          }),
        } as Response);
      }
      return originalFetch!(input, init);
    });

    render(<MessageList threadId="thread-1" />, { wrapper: createWrapper() });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar as mensagens");
    expect(alert).toHaveTextContent("Falha temporária");

    await user.click(within(alert).getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Sem mensagens nesta conversa")).toBeInTheDocument();
    expect(messageRequests).toBe(2);
  });

  it("MessageList vazio permite atualizar sem alterar o contrato da consulta", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let messageRequests = 0;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/inbox/conversations/thread-1/messages")) {
        messageRequests += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { messages: [], pagination: {} },
          }),
        } as Response);
      }
      return originalFetch!(input, init);
    });

    render(<MessageList threadId="thread-1" />, { wrapper: createWrapper() });

    expect(await screen.findByText("Sem mensagens nesta conversa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Atualizar" }));

    await waitFor(() => expect(messageRequests).toBe(2));
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

  it("lista vazia por filtro mantém próximo passo para Precisa de resposta", async () => {
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
    const onFilterChange = vi.fn();

    render(
      <ConversationsList
        selectedId={null}
        onSelect={vi.fn()}
        filter="mine"
        onFilterChange={onFilterChange}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={vi.fn()}
        queueFilter={null}
        queues={[]}
        onQueueFilterChange={vi.fn()}
        tenantThreadTotal={3}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Nada por aqui neste filtro")).toBeInTheDocument();
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Precisa de resposta" })
    );
    expect(onFilterChange).toHaveBeenCalledWith("needs_response");
  });

  it("lista mostra erro acessível e retry refaz a consulta", async () => {
    const user = userEvent.setup();
    let conversationRequests = 0;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/inbox/conversations") && !url.includes("/messages")) {
        conversationRequests += 1;
        if (conversationRequests === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: "Inbox indisponível" }),
          } as Response);
        }
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

    render(
      <ConversationsList
        selectedId={null}
        onSelect={vi.fn()}
        filter="needs_response"
        onFilterChange={vi.fn()}
        lineFilter={null}
        lines={[]}
        onLineFilterChange={vi.fn()}
        queueFilter={null}
        queues={[]}
        onQueueFilterChange={vi.fn()}
        tenantThreadTotal={2}
      />,
      { wrapper: createWrapper() }
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar as conversas");
    await user.click(within(alert).getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Tudo em dia")).toBeInTheDocument();
    expect(conversationRequests).toBe(2);
  });

  it("ChatHeader mostra tags da thread em Mais", async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole("button", { name: "Mais" }));
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

  it("InternalNotesPanel renderiza autor, cria nota e invalida notas e audit", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    const createdAt = "2026-07-27T15:00:00.000Z";
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/internal-notes")) {
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                note: {
                  id: "note-2",
                  body: "Nova nota",
                  userId: "u1",
                  authorName: "Agente",
                  createdAt,
                  updatedAt: createdAt,
                },
              },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes: [
                {
                  id: "note-1",
                  body: "Nota inicial",
                  userId: "u1",
                  authorName: "Agente",
                  createdAt,
                  updatedAt: createdAt,
                },
              ],
            },
          }),
        } as Response);
      }
      return originalFetch!(input, init);
    });
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(<InternalNotesPanel threadId="thread-1" onClose={vi.fn()} />, {
      wrapper: createWrapper(queryClient),
    });

    expect(await screen.findByText("Nota inicial")).toBeInTheDocument();
    expect(screen.getByText(/Agente ·/)).toBeInTheDocument();

    const saveButton = screen.getByTestId("internal-note-save");
    expect(saveButton).toBeDisabled();
    await user.type(
      screen.getByPlaceholderText("Lembrete para a equipa (não é enviado ao WhatsApp)…"),
      "Nova nota"
    );
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/internal-notes"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "Nova nota" }),
        })
      );
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: INBOX_QK.internalNotes("thread-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: INBOX_QK.audit("thread-1"),
      });
    });
  });

  it("ChatWindow mostra badge de SLA excepcional no header", async () => {
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
      responseDelayMs: 7 * 60_000,
      slaLevel: "high",
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
    await user.click(screen.getByRole("button", { name: "Templates" }));
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
    await user.click(screen.getByRole("button", { name: "Playbook" }));
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
    await user.click(screen.getByRole("button", { name: "IA" }));
    await user.click(screen.getByTestId("btn-ai-suggest"));
    await waitFor(() => {
      expect(screen.getByTestId("ai-preview")).toHaveTextContent("Resposta sugerida pela IA");
    });
  });

  it("MessageInput mutex: só uma assistência aberta por vez", async () => {
    const user = userEvent.setup();
    render(<MessageInput threadId="thread-1" thread={null} />, { wrapper: createWrapper() });
    await user.click(screen.getByRole("button", { name: "Templates" }));
    expect(screen.getByTestId("template-Saudação")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-ai-suggest")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "IA" }));
    expect(screen.queryByTestId("template-Saudação")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-ai-suggest")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Playbook" }));
    expect(screen.queryByTestId("btn-ai-suggest")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-playbook-suggest")).toBeInTheDocument();
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

  it("MessageInput bloqueia double-click enquanto o primeiro envio está pendente", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let resolveSend: ((response: Response) => void) | undefined;
    const pendingSend = new Promise<Response>((resolve) => {
      resolveSend = resolve;
    });
    let sendRequests = 0;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/send") && init?.method === "POST") {
        sendRequests += 1;
        return pendingSend;
      }
      return originalFetch!(input, init);
    });

    render(<MessageInput threadId="thread-1" thread={null} />, { wrapper: createWrapper() });
    const textarea = await screen.findByPlaceholderText("Escreva a mensagem…");
    await user.type(textarea, "Uma resposta");
    await user.dblClick(screen.getByTestId("send-button"));

    await waitFor(() => {
      expect(sendRequests).toBe(1);
      expect(screen.getByTestId("send-button")).toBeDisabled();
      expect(screen.getByTestId("send-button")).toHaveTextContent("A enviar…");
    });

    resolveSend?.({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          waMessageId: "wamid.ok",
          clientRequestId: "cr-test",
          status: "sent",
          replayed: false,
        },
      }),
    } as Response);
    await waitFor(() => {
      expect(screen.getByTestId("send-button")).toHaveTextContent("Enviar");
      expect(textarea).not.toBeDisabled();
    });
  });

  it("MessageInput reverte optimistic, preserva texto e retry reutiliza clientRequestId", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let sendRequests = 0;
    const clientRequestIds: string[] = [];
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/send") && init?.method === "POST") {
        sendRequests += 1;
        const body = JSON.parse(String(init.body ?? "{}")) as {
          text?: string;
          clientRequestId?: string;
        };
        if (body.clientRequestId) clientRequestIds.push(body.clientRequestId);
        if (sendRequests === 1) {
          return Promise.resolve({
            ok: false,
            status: 502,
            json: async () => ({
              success: false,
              error: {
                code: "SEND_FAILED_PRE_META",
                message: "Cloud indisponível",
                clientRequestId: body.clientRequestId,
                retryableMeta: true,
              },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              waMessageId: "wamid.retry-ok",
              clientRequestId: body.clientRequestId,
              status: "sent",
              replayed: false,
            },
          }),
        } as Response);
      }
      return originalFetch!(input, init);
    });
    const existingMessage: WaInboxMessageRow = {
      id: "existing-message",
      waMessageId: "wamid.inbound-1",
      direction: "INBOUND",
      fromNumber: "5511999990000",
      toNumber: "551133334444",
      messageType: "TEXT",
      contentText: "Mensagem anterior",
      contentJson: null,
      ts: "2026-07-27T14:59:00.000Z",
      status: "RECEIVED",
      errorCode: null,
      errorMessage: null,
      createdAt: "2026-07-27T14:59:00.000Z",
    };
    const queryClient = createQueryClient();
    queryClient.setQueryData(INBOX_QK.messages("thread-1"), [existingMessage]);

    render(<MessageInput threadId="thread-1" thread={null} />, {
      wrapper: createWrapper(queryClient),
    });
    const textarea = await screen.findByPlaceholderText("Escreva a mensagem…");
    await user.type(textarea, "Resposta preservada");
    await user.click(screen.getByTestId("send-button"));

    expect(await screen.findByTestId("send-status-failed")).toBeInTheDocument();
    expect(screen.getByText("Não enviámos a mensagem.")).toBeInTheDocument();
    expect(textarea).toHaveValue("Resposta preservada");
    expect(queryClient.getQueryData(INBOX_QK.messages("thread-1"))).toEqual([
      existingMessage,
    ]);
    expect(sendRequests).toBe(1);

    await user.click(screen.getByTestId("send-retry"));

    await waitFor(() => {
      expect(sendRequests).toBe(2);
      expect(screen.queryByTestId("send-status-failed")).not.toBeInTheDocument();
      expect(textarea).toHaveValue("");
    });
    expect(clientRequestIds).toHaveLength(2);
    expect(clientRequestIds[0]).toBe(clientRequestIds[1]);
  });

  it("MessageInput pós-Meta: reconcile sem novo clientRequestId e sem rotular como não enviado", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let sendRequests = 0;
    const clientRequestIds: string[] = [];
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/send") && init?.method === "POST") {
        sendRequests += 1;
        const body = JSON.parse(String(init.body ?? "{}")) as { clientRequestId?: string };
        if (body.clientRequestId) clientRequestIds.push(body.clientRequestId);
        if (sendRequests === 1) {
          return Promise.resolve({
            ok: false,
            status: 502,
            json: async () => ({
              success: false,
              error: {
                code: "SEND_ALREADY_DELIVERED_TO_META",
                message: "sync fail",
                waMessageId: "wamid.meta-1",
                clientRequestId: body.clientRequestId,
                retryableMeta: false,
                reconcileOnly: true,
              },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              waMessageId: "wamid.meta-1",
              clientRequestId: body.clientRequestId,
              status: "sent",
              replayed: false,
            },
          }),
        } as Response);
      }
      return originalFetch!(input, init);
    });

    render(<MessageInput threadId="thread-1" thread={null} />, { wrapper: createWrapper() });
    const textarea = await screen.findByPlaceholderText("Escreva a mensagem…");
    await user.type(textarea, "Já na Meta");
    await user.click(screen.getByTestId("send-button"));

    const failed = await screen.findByTestId("send-status-failed");
    expect(failed).toHaveAttribute("data-failure-kind", "reconcile");
    expect(screen.queryByText("Não enviámos a mensagem.")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("send-reconcile"));
    await waitFor(() => {
      expect(sendRequests).toBe(2);
      expect(screen.queryByTestId("send-status-failed")).not.toBeInTheDocument();
    });
    expect(clientRequestIds[0]).toBe(clientRequestIds[1]);
  });

  it("MessageInput CLOSED: bloqueia envio e Reabrir conversa chama status OPEN", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let statusBody: unknown;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/status") && init?.method === "POST") {
        statusBody = JSON.parse(String(init.body ?? "{}"));
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { status: "OPEN" } }),
        } as Response);
      }
      if (url.includes("/send") && init?.method === "POST") {
        throw new Error("send não deve ser chamado com composer CLOSED");
      }
      return originalFetch!(input, init);
    });

    const closedThread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "pn-meta-1",
      contactName: "Cliente",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: null,
      status: "CLOSED",
      isUnassigned: true,
      isAssignedToMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<MessageInput threadId="thread-1" thread={closedThread} />, {
      wrapper: createWrapper(),
    });

    const lock = await screen.findByTestId("composer-authorship-lock");
    expect(lock).toHaveAttribute("data-lock-kind", "closed");
    expect(screen.getByTestId("send-button")).toBeDisabled();
    await user.click(screen.getByTestId("composer-reopen"));
    await waitFor(() => {
      expect(statusBody).toEqual({ status: "OPEN" });
      expect(screen.getByTestId("composer-authorship-ok")).toHaveTextContent("Conversa reaberta.");
    });
  });

  it("MessageInput Reabrir: falha do servidor mantém lock e mostra erro", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/status") && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: "Sem permissão para reabrir" }),
        } as Response);
      }
      return originalFetch!(input, init);
    });

    const closedThread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "pn-meta-1",
      contactName: "Cliente",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: null,
      status: "CLOSED",
      isUnassigned: true,
      isAssignedToMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<MessageInput threadId="thread-1" thread={closedThread} />, {
      wrapper: createWrapper(),
    });
    await user.click(await screen.findByTestId("composer-reopen"));
    expect(await screen.findByTestId("composer-authorship-error")).toBeInTheDocument();
    expect(screen.getByTestId("composer-authorship-lock")).toHaveAttribute("data-lock-kind", "closed");
    expect(screen.getByTestId("send-button")).toBeDisabled();
  });

  it("MessageInput outro assignee: manager pode Assumir; send bloqueado", async () => {
    const user = userEvent.setup();
    const originalFetch = vi.mocked(fetch).getMockImplementation();
    let assignCalled = false;
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/verify")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              valid: true,
              user: { id: "mgr-1", role: "manager", name: "Mgr", tenantId: "tenant-1" },
            },
          }),
        } as Response);
      }
      if (url.includes("/assign") && init?.method === "POST") {
        assignCalled = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { assignedTo: "mgr-1", changed: true } }),
        } as Response);
      }
      if (url.includes("/send") && init?.method === "POST") {
        throw new Error("send não deve ser chamado com outro assignee");
      }
      return originalFetch!(input, init);
    });

    const otherThread: WaInboxThreadRow = {
      id: "thread-1",
      phoneNumber: "5511999999999",
      businessPhoneNumberId: "pn-meta-1",
      contactName: "Cliente",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      lastMessagePreview: null,
      status: "OPEN",
      isUnassigned: false,
      isAssignedToMe: false,
      assignedToUser: { id: "op-2", name: "Outro", email: "o@x.com" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<MessageInput threadId="thread-1" thread={otherThread} />, {
      wrapper: createWrapper(),
    });

    const lock = await screen.findByTestId("composer-authorship-lock");
    expect(lock).toHaveAttribute("data-lock-kind", "other_assignee");
    expect(screen.getByTestId("send-button")).toBeDisabled();
    await user.click(await screen.findByTestId("composer-assume"));
    await waitFor(() => {
      expect(assignCalled).toBe(true);
      expect(screen.getByTestId("composer-authorship-ok")).toHaveTextContent("Conversa assumida.");
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
