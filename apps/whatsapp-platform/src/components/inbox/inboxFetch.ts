import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type {
  WaInboxMessageRow,
  WaInboxThreadRow,
  InboxConversationsFilter,
  WhatsappLineSummary,
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
  businessPhoneNumberId?: string | null
): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filter && filter !== "all") {
    if (filter === "assigned_to_me") params.set("assignedTo", "me");
    else if (filter === "unassigned") params.set("assignedTo", "unassigned");
    else params.set("status", filter);
  }
  if (businessPhoneNumberId?.trim()) {
    params.set("businessPhoneNumberId", businessPhoneNumberId.trim());
  }
  return `/api/inbox/conversations?${params.toString()}`;
}

export async function fetchInboxConversations(
  filter?: InboxConversationsFilter,
  businessPhoneNumberId?: string | null
): Promise<{
  threads: WaInboxThreadRow[];
  pagination: { limit: number; offset: number; total: number };
}> {
  const res = await fetchProtected(buildConversationsUrl(filter, businessPhoneNumberId));
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
    .filter((r) => r.status === "ACTIVE")
    .map((r) => ({
      phoneNumberId: r.phoneNumberId,
      label: r.label,
      displayPhoneNumber: r.displayPhoneNumber,
      isPrimary: r.isPrimary,
      isDefaultOutbound: r.isDefaultOutbound,
      status: r.status,
    }));
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
      error?: string | { message?: string };
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
    const msg =
      typeof j.error === "string"
        ? j.error
        : j.error && typeof j.error === "object" && "message" in j.error
          ? String(j.error.message)
          : `Erro ${res.status}`;
    throw new Error(msg);
  }
}
