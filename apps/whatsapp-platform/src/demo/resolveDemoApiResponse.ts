import type { NextRequest } from "next/server";
import { getDemoJwtPayload } from "./demoAuth";

function demoTraceId(): string {
  return `demo-trace-${Date.now()}`;
}
import {
  DEMO_AGENTS,
  DEMO_BILLING_UI,
  DEMO_INBOX_TAGS,
  DEMO_INBOX_THREADS,
  DEMO_INBOX_USERS,
  DEMO_MANAGER_DASHBOARD,
  DEMO_METRICS_OVERVIEW,
  DEMO_PHONE_NUMBERS_LIST,
  DEMO_PRESENCE,
  DEMO_PROSPECT_METRICS,
  DEMO_QUEUES,
  DEMO_TENANT_ME,
  demoMessagesForThread,
} from "./fixtures";
import { DEMO_THREAD_PRIMARY, DEMO_THREAD_UNASSIGNED } from "./constants";

export type DemoApiMock = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

function okJson(body: unknown, extraHeaders?: Record<string, string>): DemoApiMock {
  return { status: 200, body, headers: extraHeaders };
}

function apiSuccess<T>(data: T): DemoApiMock {
  return okJson({ success: true, data, error: null, trace_id: demoTraceId() });
}

function apiError(code: string, message: string, status = 404): DemoApiMock {
  return {
    status,
    body: { success: false, data: null, error: { code, message }, trace_id: demoTraceId() },
  };
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function matchInboxThreadId(path: string): string | null {
  const m = path.match(/^\/api\/inbox\/conversations\/([^/]+)$/);
  return m?.[1] ?? null;
}

function matchInboxThreadSub(path: string): { threadId: string; action: string } | null {
  const m = path.match(/^\/api\/inbox\/conversations\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { threadId: m[1], action: m[2] };
}

/** Resposta mock para rotas `/api/*` em showcase demo; `null` = deixar handler real (evitar em produção demo). */
export function resolveDemoApiResponse(request: NextRequest): DemoApiMock | null {
  const path = normalizePath(request.nextUrl.pathname);
  const method = request.method.toUpperCase();

  if (path === "/api/auth/verify" && method === "GET") {
    const payload = getDemoJwtPayload();
    return apiSuccess({
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    });
  }

  if (path === "/api/metrics/overview" && method === "GET") {
    return okJson(DEMO_METRICS_OVERVIEW);
  }

  if (path === "/api/metrics/manager-dashboard" && method === "GET") {
    return okJson(DEMO_MANAGER_DASHBOARD);
  }

  if (path === "/api/metrics/revenue" && method === "GET") {
    return apiSuccess({
      totalRevenue: 42_800,
      dealsWon: 9,
      conversionRate: 0.34,
      avgTicket: 4_755,
      activeThreads: 14,
      days: 30,
    });
  }

  if (path === "/api/agents" && method === "GET") {
    return okJson({ success: true, data: { agents: DEMO_AGENTS } });
  }

  if (path === "/api/queues" && method === "GET") {
    return okJson({ success: true, data: { queues: DEMO_QUEUES } });
  }

  if (path === "/api/whatsapp/phone-numbers" && method === "GET") {
    return okJson({ success: true, data: DEMO_PHONE_NUMBERS_LIST });
  }

  if (path === "/api/inbox/conversations" && method === "GET") {
    return apiSuccess({
      threads: DEMO_INBOX_THREADS,
      pagination: { limit: 100, offset: 0, total: DEMO_INBOX_THREADS.length },
    });
  }

  if (path === "/api/inbox/tags" && method === "GET") {
    return apiSuccess({ tags: DEMO_INBOX_TAGS });
  }

  if (path === "/api/inbox/users" && method === "GET") {
    return apiSuccess({ users: DEMO_INBOX_USERS });
  }

  if (path === "/api/inbox/presence" && method === "GET") {
    return apiSuccess(DEMO_PRESENCE);
  }

  if (path === "/api/inbox/prospect-metrics" && method === "GET") {
    return apiSuccess(DEMO_PROSPECT_METRICS);
  }

  if (path === "/api/inbox/metrics" && method === "GET") {
    return apiSuccess({
      openCount: 14,
      unassignedCount: 3,
      avgFirstResponseMs: 198_000,
    });
  }

  const threadIdOnly = matchInboxThreadId(path);
  if (threadIdOnly && method === "GET") {
    const thread = DEMO_INBOX_THREADS.find((t) => t.id === threadIdOnly);
    if (!thread) return apiError("NOT_FOUND", "Conversa não encontrada (demo)", 404);
    return apiSuccess({ thread });
  }

  const threadSub = matchInboxThreadSub(path);
  if (threadSub) {
    const { threadId, action } = threadSub;
    if (action === "messages" && method === "GET") {
      return apiSuccess({ messages: demoMessagesForThread(threadId) });
    }
    if (action === "internal-notes" && method === "GET") {
      return apiSuccess({
        notes: [
          {
            id: "demo-note-1",
            body: "Cliente pediu retorno após 14h (demo).",
            authorUserId: DEMO_INBOX_USERS[0].id,
            authorName: DEMO_INBOX_USERS[0].name,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }
    if (action === "suggest-reply" && method === "POST") {
      return apiSuccess({
        text: "Posso confirmar o horário das 10h — ainda temos vaga na agenda de amanhã (resposta demo).",
      });
    }
    if (action === "suggest-playbook" && method === "POST") {
      return apiSuccess({ playbookId: "demo-playbook-1", title: "Confirmação de consulta" });
    }
    if (
      (action === "assign" ||
        action === "status" ||
        action === "send" ||
        action === "typing" ||
        action === "follow-up/log" ||
        action === "prospect" ||
        action === "queue" ||
        action === "tags") &&
      (method === "POST" || method === "PATCH" || method === "PUT")
    ) {
      return apiSuccess({ ok: true, demo: true });
    }
  }

  if (path === "/api/billing/ui" && method === "GET") {
    return okJson({ success: true, data: DEMO_BILLING_UI });
  }

  if (path === "/api/billing/subscription" && method === "GET") {
    return okJson({
      success: true,
      data: {
        plan: "OPERATIONAL_BASE",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 86400_000 * 30).toISOString(),
      },
    });
  }

  if (path === "/api/billing/usage" && method === "GET") {
    return okJson({
      success: true,
      data: {
        messages: { used: 420, limit: 5000 },
        ai: { tokensUsed: 18400, tokensLimit: 50000 },
      },
    });
  }

  if (path === "/api/tenants/me" && method === "GET") {
    return okJson(DEMO_TENANT_ME);
  }

  if (path === "/api/tenants/me" && (method === "PATCH" || method === "POST")) {
    return okJson({ ...DEMO_TENANT_ME, demo: true });
  }

  if (path === "/api/faq" && method === "GET") {
    return okJson({
      items: [
        { id: "demo-faq-1", question: "Horário de atendimento?", answer: "Seg–Sex, 8h–18h (demo)." },
      ],
    });
  }

  if (path === "/api/ai/config" && method === "GET") {
    return apiSuccess({
      autoReply: true,
      maxTokens: 400,
      temperature: 0.4,
      systemPromptExtra: "Modo vitrine — sem LLM real.",
    });
  }

  if (path === "/api/realtime/stream") {
    return { status: 204, body: null, headers: { "Cache-Control": "no-store" } };
  }

  if (path.startsWith("/api/inbox/queue/next") && method === "GET") {
    const unassigned = DEMO_INBOX_THREADS.find((t) => t.isUnassigned) ?? DEMO_INBOX_THREADS[1];
    return apiSuccess({
      thread: unassigned,
      assigned: false,
    });
  }

  if (path.startsWith("/api/admin/queue/next") && method === "GET") {
    return apiSuccess({ threadId: DEMO_THREAD_UNASSIGNED });
  }

  if (path.startsWith("/api/admin/agent-status") && method === "GET") {
    return okJson({
      agents: DEMO_AGENTS.map((a) => ({ userId: a.userId, status: a.status })),
    });
  }

  if (method === "POST" || method === "PATCH") {
    if (
      path.startsWith("/api/billing/") ||
      path.startsWith("/api/stripe/") ||
      path.startsWith("/api/support/")
    ) {
      return apiSuccess({ ok: true, demo: true });
    }
  }

  if (path.startsWith("/api/inbox/") || path.startsWith("/api/metrics/")) {
    return apiSuccess({ demo: true, threadId: DEMO_THREAD_PRIMARY });
  }

  return null;
}
