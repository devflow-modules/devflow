"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ConversationsList } from "./ConversationsList";
import { ChatWindow } from "./ChatWindow";
import { fetchInboxConversations } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter } from "./inboxTypes";
import { useMediaMd } from "./useMediaMd";
import { useInboxRealtime, InboxRealtimeProvider } from "./useInboxRealtime";
import { OnlineUsersBadge } from "./OnlineUsersBadge";

/** Polling: 10s quando realtime conectado, 5s como fallback. */
const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

export function InboxShell() {
  return (
    <InboxRealtimeProvider>
      <InboxShellContent />
    </InboxRealtimeProvider>
  );
}

function InboxShellContent() {
  const isMd = useMediaMd();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [filter, setFilter] = useState<InboxConversationsFilter>("all");
  const { connected: realtimeConnected } = useInboxRealtime();

  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data: convData } = useQuery({
    queryKey: INBOX_QK.conversations(filter),
    queryFn: () => fetchInboxConversations(filter),
    refetchInterval: pollInterval,
  });

  const selectedThread = useMemo(
    () => convData?.threads.find((t) => t.id === selectedId) ?? null,
    [convData, selectedId]
  );

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileChat(true);
  }, []);

  const onBack = useCallback(() => {
    setMobileChat(false);
  }, []);

  const showSidebar = isMd || !mobileChat || !selectedId;
  const showChatColumn = isMd || (mobileChat && Boolean(selectedId));

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-100">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-emerald-700 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
          <span
            className="flex items-center gap-1.5 text-xs text-gray-500"
            title={realtimeConnected ? "Tempo real ativo" : "Reconectando…"}
          >
            <span
              className={`h-2 w-2 rounded-full ${realtimeConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}
            />
            {realtimeConnected ? "Tempo real" : "Polling"}
          </span>
        </div>
        <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
          Configurações
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showSidebar && (
          <aside className="flex w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-[360px] md:max-w-[40vw]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Conversas
              </p>
              <OnlineUsersBadge />
            </div>
            <ConversationsList
              selectedId={selectedId}
              onSelect={onSelect}
              filter={filter}
              onFilterChange={setFilter}
            />
          </aside>
        )}

        {showChatColumn && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedId ? (
              <ChatWindow
                threadId={selectedId}
                thread={selectedThread}
                showBack={!isMd}
                onBackMobile={onBack}
              />
            ) : (
              <div className="hidden flex-1 items-center justify-center text-gray-400 md:flex">
                Selecione uma conversa
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
