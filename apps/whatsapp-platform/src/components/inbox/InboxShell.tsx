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

export function InboxShell() {
  const isMd = useMediaMd();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [filter, setFilter] = useState<InboxConversationsFilter>("all");

  const { data: convData } = useQuery({
    queryKey: INBOX_QK.conversations(filter),
    queryFn: () => fetchInboxConversations(filter),
    refetchInterval: 10_000,
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
        </div>
        <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
          Configurações
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showSidebar && (
          <aside className="flex w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-[360px] md:max-w-[40vw]">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Conversas
              </p>
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
