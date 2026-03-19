import type {
  WaInboxMessageRow,
  WaInboxThreadRow,
  InboxConversationsFilter,
} from "./inboxTypes";

function buildConversationsUrl(filter?: InboxConversationsFilter): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filter && filter !== "all") {
    if (filter === "assigned_to_me") params.set("assignedTo", "me");
    else if (filter === "unassigned") params.set("assignedTo", "unassigned");
    else params.set("status", filter);
  }
  return `/api/inbox/conversations?${params.toString()}`;
}

export async function fetchInboxConversations(
  filter?: InboxConversationsFilter
): Promise<{
  threads: WaInboxThreadRow[];
  pagination: { limit: number; offset: number; total: number };
}> {
  const res = await fetch(buildConversationsUrl(filter), { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar conversas");
  const json = (await res.json()) as {
    success: boolean;
    data: {
      threads: WaInboxThreadRow[];
      pagination: { limit: number; offset: number; total: number };
    };
  };
  return json.data;
}

export async function fetchInboxTags(): Promise<{ id: string; name: string; color: string }[]> {
  const res = await fetch("/api/inbox/tags", { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar tags");
  const json = (await res.json()) as { success: boolean; data: { tags: { id: string; name: string; color: string }[] } };
  return json.data.tags ?? [];
}

export async function fetchInboxUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const res = await fetch("/api/inbox/users", { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar usuários");
  const json = (await res.json()) as { success: boolean; data: { users: { id: string; name: string; email: string }[] } };
  return json.data.users ?? [];
}

export async function assignConversation(
  threadId: string,
  userId: string | null | "me"
): Promise<void> {
  const body =
    userId === null ? { unassign: true } : userId === "me" ? {} : { userId };
  const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(threadId)}/assign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Falha ao atribuir");
  }
}

export async function updateConversationStatus(
  threadId: string,
  status: "OPEN" | "PENDING" | "CLOSED"
): Promise<void> {
  const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(threadId)}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Falha ao atualizar status");
  }
}

export async function addTagToConversation(threadId: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(threadId)}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId, action: "add" }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Falha ao adicionar tag");
  }
}

export async function removeTagFromConversation(threadId: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(threadId)}/tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId, action: "remove" }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Falha ao remover tag");
  }
}

export async function fetchInboxMessages(threadId: string): Promise<WaInboxMessageRow[]> {
  const res = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/messages?limit=500`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Falha ao carregar mensagens");
  const json = (await res.json()) as {
    success: boolean;
    data: { messages: WaInboxMessageRow[] };
  };
  return json.data.messages ?? [];
}

export async function sendInboxMessage(threadId: string, text: string): Promise<void> {
  const res = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(threadId)}/send`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }
  );
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string | { message?: string } };
    const msg =
      typeof j.error === "string"
        ? j.error
        : j.error && typeof j.error === "object" && "message" in j.error
          ? String(j.error.message)
          : `Erro ${res.status}`;
    throw new Error(msg);
  }
}
