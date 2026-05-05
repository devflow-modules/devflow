import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { loginUrlWithNext } from "@/lib/safe-redirect";
import { validateAuthToken } from "@/modules/auth";
import { requireJwtAdminPage } from "@/lib/admin-page-guard";
import { buttonVariants, cn } from "@devflow/ui";
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

/** Evita `RangeError` em `toISOString()` quando o valor vindo da DB não é uma data válida (derruba o RSC). */
function safeDateToIsoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  const ms = value.getTime();
  return Number.isNaN(ms) ? null : value.toISOString();
}

async function getConversations(
  status: WaInboxThreadStatus | undefined,
  tenantId: string
): Promise<ConversationItem[]> {
  try {
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
      lastMessageAt: safeDateToIsoString(t.lastMessageAt),
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
  await requireJwtAdminPage("/admin/conversations");
  const { status } = await searchParams;
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (!auth) {
    redirect(loginUrlWithNext("/admin/conversations"));
  }
  const tenantId = auth.payload.tenantId;
  const validStatus =
    status && TAB_STATUSES.some((t) => t.status === status)
      ? (status as WaInboxThreadStatus)
      : undefined;
  const conversations = tenantId ? await getConversations(validStatus, tenantId) : [];

  return (
    <div className="rounded-xl border border-border/80 bg-muted/60/50 shadow-sm">
      <header className="sticky top-0 z-10 rounded-t-xl border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-semibold df-text-primary">Conversas</h1>
          <div className="flex gap-1">
            {TAB_STATUSES.map((tab) => {
              const href =
                tab.status !== undefined
                  ? `/admin/conversations?status=${tab.status}`
                  : "/admin/conversations";
              const tabVariant =
                (tab.status === undefined && validStatus === undefined) || tab.status === validStatus
                  ? "default"
                  : "ghost";
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={buttonVariants({ variant: tabVariant, size: "sm" })}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <Link
            href="/distribuir"
            className={cn("shrink-0", buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Distribuir
          </Link>
          <Link href="/admin/metrics" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Métricas
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        {conversations.length === 0 ? (
          <div className="p-6 text-center df-text-secondary">
            Nenhuma conversa ainda. As conversas aparecem aqui quando mensagens forem recebidas via webhook.
          </div>
        ) : (
          <ul className="df-divide-y-soft">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/conversations/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted",
                    c.unread > 0 && "bg-blue-50/50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium df-text-primary">
                        {c.customerName || "Cliente"}
                      </span>
                      {c.unread > 0 && (
                        <AppBadge variant="brand" className="shrink-0">
                          {c.unread}
                        </AppBadge>
                      )}
                    </div>
                    {c.lastMessage && (
                      <p className="mt-0.5 truncate text-sm df-text-secondary">{c.lastMessage}</p>
                    )}
                  </div>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-xs df-text-muted">
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
