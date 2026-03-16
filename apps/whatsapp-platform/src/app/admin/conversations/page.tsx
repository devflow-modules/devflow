import type { Metadata } from "next";
import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations } from "@/modules/conversations";
import { listTenants } from "@/modules/tenants";
import { getLastMessageForConversationIds } from "@/modules/messaging";
import { Button, Badge, cn } from "@devflow/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversas | Admin — WhatsApp Platform",
  description: "Lista de conversas para atendimento.",
  robots: "noindex, nofollow",
};

type ConversationItem = {
  id: string;
  customerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

async function getConversations(): Promise<ConversationItem[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) return [];
    const conversations = await listConversations(tenantId, 100);
    const ids = conversations.map((c) => c.id);
    const lastMessages = await getLastMessageForConversationIds(ids);
    return conversations.map((c) => {
      const last = lastMessages.get(c.id);
      return {
        id: c.id,
        customerName: c.wa_from,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? null,
        unread: 0,
      };
    });
  } catch {
    return [];
  }
}

export default async function AdminConversationsPage() {
  const conversations = await getConversations();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Conversas</h1>
          <Link href="/admin/metrics">
            <Button variant="ghost" size="sm">
              Métricas
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-slate-600">
            Nenhuma conversa ainda. As conversas aparecem aqui quando mensagens forem recebidas via webhook.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/conversations/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100",
                    c.unread > 0 && "bg-blue-50/50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">
                        {c.customerName || "Cliente"}
                      </span>
                      {c.unread > 0 && (
                        <Badge variant="primary" className="shrink-0">
                          {c.unread}
                        </Badge>
                      )}
                    </div>
                    {c.lastMessage && (
                      <p className="mt-0.5 truncate text-sm text-slate-600">{c.lastMessage}</p>
                    )}
                  </div>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(c.lastMessageAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
