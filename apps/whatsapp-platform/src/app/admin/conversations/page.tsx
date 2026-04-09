import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listTenants } from "@/modules/tenants";
import { Button, cn } from "@devflow/ui";
import { AppBadge } from "@/components/ui/app-badge";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

export const dynamic = "force-dynamic";

const TAB_STATUSES: { label: string; status?: WaInboxThreadStatus }[] = [
  { label: "Todas" },
  { label: "Abertas", status: WaInboxThreadStatus.OPEN },
  { label: "Pendentes", status: WaInboxThreadStatus.PENDING },
  { label: "Fechadas", status: WaInboxThreadStatus.CLOSED },
];

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

async function getConversations(status?: WaInboxThreadStatus): Promise<ConversationItem[]> {
  try {
    const tenants = await listTenants();
    const tenantId = tenants[0]?.id;
    if (!tenantId) return [];
    const threads = await prisma.waInboxThread.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        lastMessagePreview: true,
        lastMessageAt: true,
        unreadCount: true,
      },
    });
    return threads.map((t) => ({
      id: t.id,
      customerName: t.contactName ?? t.phoneNumber,
      lastMessage: t.lastMessagePreview,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      unread: t.unreadCount,
    }));
  } catch {
    return [];
  }
}

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus =
    status && TAB_STATUSES.some((t) => t.status === status)
      ? (status as WaInboxThreadStatus)
      : undefined;
  const conversations = await getConversations(validStatus);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Conversas</h1>
          <div className="flex gap-1">
            {TAB_STATUSES.map((tab) => {
              const href =
                tab.status !== undefined
                  ? `/admin/conversations?status=${tab.status}`
                  : "/admin/conversations";
              return (
                <Link key={tab.label} href={href}>
                  <Button
                    variant={
                      (tab.status === undefined && validStatus === undefined) ||
                      tab.status === validStatus
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                  >
                    {tab.label}
                  </Button>
                </Link>
              );
            })}
          </div>
          <Link href="/admin/distribuir" className="shrink-0">
            <Button variant="outline" size="sm">
              Distribuir
            </Button>
          </Link>
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
                        <AppBadge variant="brand" className="shrink-0">
                          {c.unread}
                        </AppBadge>
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
