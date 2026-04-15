import type { Page } from "@playwright/test";

/** IDs estáveis para interceptação — não existem na DB real. */
export const E2E_INBOX_THREAD_A = "e2e-wa-inbox-thread-a";
export const E2E_INBOX_THREAD_B = "e2e-wa-inbox-thread-b";

const PN = "pn-e2e-inbox-1";

type ThreadRow = Record<string, unknown>;
type MessageRow = Record<string, unknown>;

function iso(): string {
  return new Date().toISOString();
}

function inbound(text: string): MessageRow {
  const t = iso();
  return {
    id: `msg-in-${Math.random().toString(36).slice(2, 9)}`,
    waMessageId: "wam-in",
    direction: "INBOUND",
    fromNumber: "5511999990001",
    toNumber: "5511888880001",
    messageType: "TEXT",
    contentText: text,
    contentJson: null,
    ts: t,
    status: "RECEIVED",
    errorCode: null,
    errorMessage: null,
    createdAt: t,
  };
}

function outbound(text: string): MessageRow {
  const t = iso();
  return {
    id: `msg-out-${Math.random().toString(36).slice(2, 9)}`,
    waMessageId: "wam-out",
    direction: "OUTBOUND",
    fromNumber: "5511888880001",
    toNumber: "5511999990001",
    messageType: "TEXT",
    contentText: text,
    contentJson: null,
    ts: t,
    status: "SENT",
    errorCode: null,
    errorMessage: null,
    createdAt: t,
  };
}

function baseThread(overrides: Partial<ThreadRow>): ThreadRow {
  const t = iso();
  return {
    id: E2E_INBOX_THREAD_A,
    phoneNumber: "+5511999990001",
    businessPhoneNumberId: PN,
    contactName: "Cliente Alfa",
    lastMessageAt: t,
    unreadCount: 1,
    unansweredInboundCount: 1,
    conversationState: "awaiting_agent",
    lastResponderType: null,
    lastMessagePreview: "Olá da Alfa",
    status: "OPEN",
    priority: "MEDIUM",
    leadScore: 72,
    leadData: { name: "Lead Alfa", interest: "Demo" },
    aiState: "qualifying",
    isUnassigned: true,
    isAssignedToMe: false,
    assignedToUser: null,
    threadTags: [],
    responseDelayMs: null,
    slaLevel: "low",
    createdAt: t,
    updatedAt: t,
    whatsappLine: {
      phoneNumberId: PN,
      label: "Linha E2E",
      displayPhoneNumber: "+5511888880001",
      isPrimary: true,
      isDefaultOutbound: true,
      status: "ACTIVE",
    },
    ...overrides,
  };
}

export type InboxMockStore = {
  threads: ThreadRow[];
  messagesByThread: Record<string, MessageRow[]>;
  sendShouldFailOnce: boolean;
  sendFailConsumed: boolean;
};

export function createDefaultInboxMockStore(): InboxMockStore {
  const threadA = baseThread({ id: E2E_INBOX_THREAD_A, contactName: "Cliente Alfa" });
  const threadB = baseThread({
    id: E2E_INBOX_THREAD_B,
    phoneNumber: "+5511999990002",
    contactName: "Cliente Beta",
    lastMessagePreview: "Olá da Beta",
    conversationState: "awaiting_agent",
    unansweredInboundCount: 1,
    isUnassigned: true,
    isAssignedToMe: false,
    assignedToUser: null,
  });
  return {
    threads: [threadA, threadB],
    messagesByThread: {
      [E2E_INBOX_THREAD_A]: [inbound("Olá da Alfa")],
      [E2E_INBOX_THREAD_B]: [inbound("Olá da Beta")],
    },
    sendShouldFailOnce: false,
    sendFailConsumed: false,
  };
}

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function parseConversationsPath(pathname: string):
  | { kind: "list" }
  | { kind: "thread"; id: string }
  | { kind: "messages"; id: string }
  | { kind: "send"; id: string }
  | { kind: "assign"; id: string }
  | { kind: "status"; id: string }
  | { kind: "sub"; id: string; sub: string }
  | null {
  const prefix = "/api/inbox/conversations";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/^\//, "");
  if (!rest) return { kind: "list" };
  const segments = rest.split("/");
  const id = segments[0];
  if (!id) return { kind: "list" };
  const sub = segments[1];
  if (!sub) return { kind: "thread", id };
  if (sub === "messages") return { kind: "messages", id };
  if (sub === "send") return { kind: "send", id };
  if (sub === "assign") return { kind: "assign", id };
  if (sub === "status") return { kind: "status", id };
  return { kind: "sub", id, sub };
}

function findThread(store: InboxMockStore, id: string): ThreadRow | undefined {
  return store.threads.find((t) => t.id === id) as ThreadRow | undefined;
}

function updateThread(store: InboxMockStore, id: string, patch: Partial<ThreadRow>) {
  const i = store.threads.findIndex((t) => t.id === id);
  if (i < 0) return;
  store.threads[i] = { ...store.threads[i], ...patch };
}

/**
 * Intercepta APIs usadas pela inbox com dados controlados (sem tocar na regra de negócio do servidor).
 * Pedidos não cobertos continuam para o backend (`route.continue()`).
 */
export async function installInboxOperationalMocks(page: Page, store: InboxMockStore): Promise<void> {
  const handler = async (route: import("@playwright/test").Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();

    if (url.pathname === "/api/whatsapp/phone-numbers" && method === "GET") {
      return route.fulfill(
        json({
          success: true,
          data: [
            {
              phoneNumberId: PN,
              label: "Linha E2E",
              displayPhoneNumber: "+5511888880001",
              isPrimary: true,
              isDefaultOutbound: true,
              status: "ACTIVE",
            },
          ],
        })
      );
    }

    if (url.pathname === "/api/queues" && method === "GET") {
      return route.fulfill(json({ success: true, data: { queues: [] } }));
    }

    if (url.pathname.startsWith("/api/inbox/metrics") && method === "GET") {
      return route.fulfill(
        json({
          success: true,
          data: {
            periodDays: 30,
            conversationsByAgent: [],
            avgQueueWaitSeconds: 12,
            avgHandleSeconds: 45,
            sampleQueue: 2,
            sampleHandle: 2,
          },
          error: null,
          trace_id: "e2e-metrics",
        })
      );
    }

    if (url.pathname === "/api/inbox/team" && method === "GET") {
      return route.fulfill(
        json({
          success: true,
          data: {
            members: [
              {
                userId: "e2e-user",
                name: "Operador E2E",
                email: "op@test.dev",
                role: "agent",
                status: "available",
                activeThreadCount: 0,
                queues: [],
                lastActivityAt: iso(),
              },
            ],
          },
          error: null,
          trace_id: "e2e-team",
        })
      );
    }

    if (url.pathname === "/api/inbox/tags" && method === "GET") {
      return route.fulfill(json({ success: true, data: { tags: [] } }));
    }

    if (url.pathname === "/api/inbox/users" && method === "GET") {
      return route.fulfill(json({ success: true, data: { users: [] } }));
    }

    const conv = parseConversationsPath(url.pathname);
    if (!conv) return route.continue();

    if (conv.kind === "list" && method === "GET") {
      const phase = url.searchParams.get("phase") ?? "";
      let threads = [...store.threads];
      if (phase === "closed") {
        threads = threads.filter((t) => t.status === "CLOSED");
      } else if (phase === "awaiting_customer") {
        threads = threads.filter((t) => t.conversationState === "awaiting_customer");
      } else if (phase === "needs_response" || phase === "unassigned") {
        threads = threads.filter((t) => t.conversationState === "awaiting_agent");
      } else if (phase === "mine" || phase === "in_attendance") {
        threads = threads.filter((t) => t.isAssignedToMe === true);
      }
      return route.fulfill(
        json({
          success: true,
          data: {
            threads,
            pagination: { limit: 100, offset: 0, total: threads.length },
          },
          error: null,
          trace_id: "e2e-list",
        })
      );
    }

    if (conv.kind === "thread" && method === "GET") {
      const t = findThread(store, conv.id);
      if (!t) return route.fulfill(json({ success: false, error: { message: "não encontrada" } }, 404));
      return route.fulfill(json({ success: true, data: { thread: t } }));
    }

    if (conv.kind === "messages" && method === "GET") {
      const messages = store.messagesByThread[conv.id] ?? [];
      return route.fulfill(
        json({
          success: true,
          data: { threadId: conv.id, messages, pagination: { limit: 500, offset: 0 } },
        })
      );
    }

    if (conv.kind === "assign" && method === "POST") {
      updateThread(store, conv.id, {
        assignedToUser: { id: "e2e-user", name: "Operador E2E", email: "op@test.dev" },
        isAssignedToMe: true,
        isUnassigned: false,
        conversationState: "in_progress",
        unansweredInboundCount: 0,
      });
      return route.fulfill(json({ success: true, data: { assignedTo: "e2e-user" } }));
    }

    if (conv.kind === "status" && method === "POST") {
      let body: { status?: string } = {};
      try {
        body = JSON.parse(req.postData() || "{}") as { status?: string };
      } catch {
        body = {};
      }
      const st = body.status;
      if (st === "CLOSED") {
        updateThread(store, conv.id, {
          status: "CLOSED",
          conversationState: "closed",
        });
      } else if (st === "PENDING") {
        updateThread(store, conv.id, { status: "PENDING" });
      } else if (st === "OPEN") {
        updateThread(store, conv.id, {
          status: "OPEN",
          conversationState: "awaiting_agent",
          assignedToUser: null,
          isAssignedToMe: false,
          isUnassigned: true,
        });
      }
      return route.fulfill(json({ success: true, data: { status: st } }));
    }

    if (conv.kind === "send" && method === "POST") {
      if (store.sendShouldFailOnce && !store.sendFailConsumed) {
        store.sendFailConsumed = true;
        return route.fulfill(
          json({ success: false, error: { message: "E2E: falha simulada no envio" } }, 502)
        );
      }
      let body: { text?: string } = {};
      try {
        body = JSON.parse(req.postData() || "{}") as { text?: string };
      } catch {
        body = {};
      }
      const text = (body.text ?? "").trim();
      if (!text) return route.fulfill(json({ error: "text inválido" }, 400));
      const list = store.messagesByThread[conv.id] ?? (store.messagesByThread[conv.id] = []);
      list.push(outbound(text));
      updateThread(store, conv.id, {
        lastMessagePreview: text.length > 200 ? `${text.slice(0, 199)}…` : text,
        lastMessageAt: iso(),
      });
      return route.fulfill(json({ success: true, data: { messageId: "e2e-mid", waMessageId: "e2e-mid" } }));
    }

    if (conv.kind === "sub" && method === "POST") {
      return route.fulfill(json({ success: true, data: {} }));
    }

    return route.continue();
  };

  await page.route("**/api/whatsapp/phone-numbers**", handler);
  await page.route("**/api/queues**", handler);
  await page.route("**/api/inbox/metrics**", handler);
  await page.route("**/api/inbox/team**", handler);
  await page.route("**/api/inbox/tags**", handler);
  await page.route("**/api/inbox/users**", handler);
  await page.route("**/api/inbox/conversations**", handler);
}
