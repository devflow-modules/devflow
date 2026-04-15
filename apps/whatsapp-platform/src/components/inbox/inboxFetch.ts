import {
  fetchProtected,
  FeatureBlockedError,
  parseFeatureNotAvailable,
  protectedApiUserMessage,
} from "@/lib/protected-fetch";
import { unwrapApiData } from "@/lib/api-json-client";
import type {
  WaInboxMessageRow,
  WaInboxThreadRow,
  InboxConversationsFilter,
  WhatsappLineSummary,
  InternalNoteRow,
} from "./inboxTypes";

async function inboxFailMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    code?: string;
  };
  return protectedApiUserMessage(res.status, data);
}

function buildConversationsUrl(
  filter?: InboxConversationsFilter,
  businessPhoneNumberId?: string | null,
  queueId?: string | null,
  priority?: string | null
): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filter === "all") {
    params.set("phase", "all");
  } else if (filter) {
    params.set("phase", filter);
  }
  if (businessPhoneNumberId?.trim()) {
    params.set("businessPhoneNumberId", businessPhoneNumberId.trim());
  }
  if (queueId?.trim()) {
    params.set("queueId", queueId.trim());
  }
  if (priority?.trim()) {
    params.set("priority", priority.trim().toUpperCase());
  }
  return `/api/inbox/conversations?${params.toString()}`;
}

export async function fetchInboxConversations(
  filter?: InboxConversationsFilter,
  businessPhoneNumberId?: string | null,
  queueId?: string | null,
  priority?: string | null
): Promise<{
  threads: WaInboxThreadRow[];
  pagination: { limit: number; offset: number; total: number };
}> {
  const res = await fetchProtected(
    buildConversationsUrl(filter, businessPhoneNumberId, queueId, priority)
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data: {
      threads: WaInboxThreadRow[];
      pagination: { limit: number; offset: number; total: number };
    };
  };
  return json.data;
}

export async function fetchInboxThread(threadId: string): Promise<WaInboxThreadRow> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}`);
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data: { thread: WaInboxThreadRow };
  };
  return json.data.thread;
}

export async function fetchSuggestedReply(threadId: string): Promise<{ text: string }> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/suggest-reply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data?: { text: string };
    error?: { message?: string };
  };
  if (!json.success || !json.data?.text?.trim()) {
    throw new Error(json.error?.message ?? "Não foi possível gerar a sugestão");
  }
  return { text: json.data.text.trim() };
}

export async function fetchInternalNotes(threadId: string): Promise<InternalNoteRow[]> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/internal-notes`
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as { success: boolean; data: { notes: InternalNoteRow[] } };
  return json.data.notes ?? [];
}

export async function createInternalNoteApi(threadId: string, body: string): Promise<InternalNoteRow> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/internal-notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as { success: boolean; data: { note: InternalNoteRow } };
  return json.data.note;
}

export async function deleteInternalNoteApi(threadId: string, noteId: string): Promise<void> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/internal-notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
}

export type PlaybookSuggestion = {
  intent: string;
  recommendedAction: string;
  suggestedResponse: string;
  tokensUsed: number | null;
  durationMs: number;
};

export async function fetchPlaybookSuggestion(threadId: string): Promise<PlaybookSuggestion> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/suggest-playbook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data?: PlaybookSuggestion;
    error?: { message?: string };
  };
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? "Não foi possível gerar o playbook");
  }
  return json.data;
}

export async function logFollowUpUse(threadId: string): Promise<void> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/follow-up/log`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  if (!res.ok) {
    console.warn("[inbox] logFollowUpUse failed", res.status);
  }
}

export async function fetchTenantWhatsappLines(): Promise<WhatsappLineSummary[]> {
  const res = await fetchProtected("/api/whatsapp/phone-numbers");
  if (!res.ok) return [];
  const json = (await res.json()) as {
    success?: boolean;
    data?: Array<{
      phoneNumberId: string;
      label: string | null;
      displayPhoneNumber: string | null;
      isPrimary: boolean;
      isDefaultOutbound: boolean;
      status: string;
    }>;
  };
  const rows = json.data ?? [];
  return rows
    .filter((r) => r.status === "ACTIVE" || r.status === "PENDING_ACTIVATION")
    .map((r) => ({
      phoneNumberId: r.phoneNumberId,
      label: r.label,
      displayPhoneNumber: r.displayPhoneNumber,
      isPrimary: r.isPrimary,
      isDefaultOutbound: r.isDefaultOutbound,
      status: r.status,
    }));
}

/** Linha com token Meta válido — envio humano / automações. */
export function isWhatsappOutboundEnabledForThread(
  lines: WhatsappLineSummary[],
  businessPhoneNumberId: string | null | undefined
): boolean {
  const id = businessPhoneNumberId?.trim();
  if (!id) return false;
  const line = lines.find((l) => l.phoneNumberId === id);
  return Boolean(line?.status === "ACTIVE");
}

export async function fetchInboxTags(): Promise<{ id: string; name: string; color: string }[]> {
  const res = await fetchProtected("/api/inbox/tags");
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as { success: boolean; data: { tags: { id: string; name: string; color: string }[] } };
  return json.data.tags ?? [];
}

export async function fetchInboxUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const res = await fetchProtected("/api/inbox/users");
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as { success: boolean; data: { users: { id: string; name: string; email: string }[] } };
  return json.data.users ?? [];
}

export async function fetchOnlineUsers(): Promise<Array<{ userId: string; name?: string; email?: string }>> {
  const res = await fetchProtected("/api/inbox/presence");
  if (!res.ok) return [];
  const json = (await res.json()) as {
    success: boolean;
    data: { users: Array<{ userId: string; name?: string; email?: string }> };
  };
  return json.data?.users ?? [];
}

export async function assignConversation(
  threadId: string,
  userId: string | null | "me"
): Promise<void> {
  const body =
    userId === null ? { unassign: true } : userId === "me" ? {} : { userId };
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await inboxFailMessage(res));
}

export async function updateConversationStatus(
  threadId: string,
  status: "OPEN" | "PENDING" | "CLOSED"
): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await inboxFailMessage(res));
}

export async function addTagToConversation(threadId: string, tagId: string): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId, action: "add" }),
  });
  if (!res.ok) throw new Error(await inboxFailMessage(res));
}

export async function removeTagFromConversation(threadId: string, tagId: string): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId, action: "remove" }),
  });
  if (!res.ok) throw new Error(await inboxFailMessage(res));
}

export async function fetchInboxMessages(threadId: string): Promise<WaInboxMessageRow[]> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/messages?limit=500`
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data: { messages: WaInboxMessageRow[] };
  };
  return json.data.messages ?? [];
}

export async function reportViewing(threadId: string, viewing: boolean): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ viewing }),
  });
  if (!res.ok) {
    console.warn("[inbox] reportViewing failed", res.status);
  }
}

export async function reportTyping(threadId: string, typing: boolean): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/typing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ typing }),
  });
  if (!res.ok) {
    console.warn("[inbox] reportTyping failed", res.status);
  }
}

export async function fetchInboxAuditLog(threadId: string): Promise<
  Array<{
    id: string;
    threadId: string;
    userId: string;
    action: string;
    metadata: unknown;
    createdAt: string;
    user?: { id: string; name: string };
  }>
> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/audit?limit=50`
  );
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data: { logs: Array<{ id: string; threadId: string; userId: string; action: string; metadata: unknown; createdAt: string; user?: { id: string; name: string } }> };
  };
  return json.data.logs ?? [];
}

export async function sendInboxMessage(threadId: string, text: string): Promise<void> {
  const res = await fetchProtected(`/api/inbox/conversations/${encodeURIComponent(threadId)}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string; code?: string; upgradeRequired?: boolean };
      message?: string;
      code?: string;
    };
    if (res.status === 401) {
      throw new Error(protectedApiUserMessage(401, {}));
    }
    if (res.status === 403) {
      const flat = {
        error: typeof j.error === "string" ? j.error : undefined,
        message: j.message,
        code: j.code,
      };
      throw new Error(protectedApiUserMessage(403, flat));
    }
    if (res.status === 402) {
      const err = j.error;
      const nested =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string; code?: string })
          : null;
      const code = nested?.code;
      const msg = nested?.message;
      if (code === "FREE_PLAN_LIMIT_REACHED") {
        throw new Error(
          msg ??
            "Atingiu o limite da avaliação guiada. A operação completa é liberada na implantação — veja Consumo e faturação ou fale connosco."
        );
      }
      throw new Error(msg ?? `Erro ${res.status}`);
    }
    const msg =
      typeof j.error === "string"
        ? j.error
        : j.error && typeof j.error === "object" && "message" in j.error
          ? String(j.error.message)
          : `Erro ${res.status}`;
    throw new Error(msg);
  }
}

export type InboxQueueOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

export async function fetchInboxOperationalQueues(): Promise<InboxQueueOption[]> {
  const res = await fetchProtected("/api/queues");
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const json = (await res.json()) as {
    success?: boolean;
    data?: { queues: InboxQueueOption[] };
  };
  return json.data?.queues ?? [];
}

export async function updateThreadQueue(threadId: string, queueId: string | null): Promise<void> {
  const res = await fetchProtected(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/queue`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId }),
    }
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 403) {
      const blocked = parseFeatureNotAvailable(data);
      if (blocked) throw new FeatureBlockedError(blocked);
    }
    throw new Error(
      protectedApiUserMessage(res.status, data as { error?: string; message?: string; code?: string })
    );
  }
}

export type InboxOperationalMetricsPayload = {
  periodDays: number;
  conversationsByAgent: Array<{ userId: string; name: string | null; openThreads: number }>;
  avgQueueWaitSeconds: number | null;
  avgHandleSeconds: number | null;
  sampleQueue: number;
  sampleHandle: number;
};

export async function fetchInboxMetrics(days = 30): Promise<InboxOperationalMetricsPayload> {
  const res = await fetchProtected(`/api/inbox/metrics?days=${encodeURIComponent(String(days))}`);
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const raw = await res.json();
  const data = unwrapApiData<InboxOperationalMetricsPayload>(raw);
  if (!data) throw new Error("Resposta de métricas inválida");
  return data;
}

export type InboxTeamMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  activeThreadCount: number;
  queues: Array<{ id: string; name: string }>;
  lastActivityAt: string | null;
};

export async function fetchInboxTeam(): Promise<InboxTeamMember[]> {
  const res = await fetchProtected("/api/inbox/team");
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const raw = await res.json();
  const data = unwrapApiData<{ members: InboxTeamMember[] }>(raw);
  return data?.members ?? [];
}

export type InboxQueueNextPayload = {
  thread: {
    id: string;
    tenantId: string;
    phoneNumber: string;
    contactName: string | null;
    status: string;
    lastMessageAt: string;
    createdAt: string;
    messages: Array<{ id: string; sender: string; content: string; timestamp: string }>;
  } | null;
  message?: string;
  priority: number;
  queuedAt: string | null;
};

export async function fetchInboxQueueNext(assign = true): Promise<InboxQueueNextPayload> {
  const res = await fetchProtected(`/api/inbox/queue/next?assign=${assign ? "true" : "false"}`);
  if (!res.ok) throw new Error(await inboxFailMessage(res));
  const raw = await res.json();
  const data = unwrapApiData<InboxQueueNextPayload>(raw);
  if (!data) throw new Error("Resposta inválida");
  return data;
}
