"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationActionBanner } from "./ConversationActionBanner";
import { useQuery } from "@tanstack/react-query";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { ChatAuditTab } from "./ChatAuditTab";
import { InternalNotesPanel } from "./InternalNotesPanel";
import { LeadDataPanel } from "./LeadDataPanel";
import { reportViewing, fetchInboxThread } from "./inboxFetch";
import { INBOX_QK, type WaInboxThreadRow } from "./inboxTypes";

/** Lista traz `unreadCount`; GET por id pode não — preservamos o da lista. */
function mergeThreadRow(
  fromList: WaInboxThreadRow | null,
  fromApi: WaInboxThreadRow | undefined
): WaInboxThreadRow | null {
  if (!fromList && !fromApi) return null;
  if (!fromApi) return fromList;
  if (!fromList) return fromApi;
  return {
    ...fromList,
    ...fromApi,
    unreadCount: fromList.unreadCount ?? fromApi.unreadCount ?? 0,
    leadScore: fromApi.leadScore ?? fromList.leadScore,
    leadData: fromApi.leadData ?? fromList.leadData,
    aiState: fromApi.aiState ?? fromList.aiState,
    lastResponderType: fromApi.lastResponderType ?? fromList.lastResponderType,
    conversationState: fromApi.conversationState ?? fromList.conversationState,
    priority: fromApi.priority ?? fromList.priority,
  };
}

export function ChatWindow({
  threadId,
  thread,
  onBackMobile,
  showBack,
  evaluationMode = false,
  compactChrome = false,
  shellSidebarCollapsed = false,
}: {
  threadId: string | null;
  thread: WaInboxThreadRow | null;
  onBackMobile?: () => void;
  showBack?: boolean;
  /** Tenant em FREE — copy lateral de avaliação guiada. */
  evaluationMode?: boolean;
  /** Cabeçalho da conversa mais baixo (modo foco inbox). */
  compactChrome?: boolean;
  /** Menu principal recuado — mais largura para o chat e compositor mais denso. */
  shellSidebarCollapsed?: boolean;
}) {
  const [auditTab, setAuditTab] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [actionBannerDismissed, setActionBannerDismissed] = useState(false);
  const prevThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setActionBannerDismissed(false);
    });
  }, [threadId]);

  const { data: fetchedThread } = useQuery({
    queryKey: threadId ? INBOX_QK.thread(threadId) : ["inbox-thread", "disabled"],
    queryFn: () => fetchInboxThread(threadId!),
    enabled: Boolean(threadId),
    staleTime: 30_000,
  });

  const activeThread = useMemo(
    () => mergeThreadRow(thread, fetchedThread),
    [thread, fetchedThread]
  );

  useEffect(() => {
    if (threadId) {
      reportViewing(threadId, true);
      prevThreadIdRef.current = threadId;
    }
    return () => {
      const prev = prevThreadIdRef.current;
      if (prev) reportViewing(prev, false);
      prevThreadIdRef.current = null;
    };
  }, [threadId]);

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-slate-50/60 xl:flex-row xl:items-stretch"
      data-testid="chat-window"
    >
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:min-h-0 xl:min-w-0 ${
          shellSidebarCollapsed ? "xl:flex-[1_1_0%]" : ""
        }`}
      >
        <ChatHeader
          threadId={threadId}
          thread={activeThread}
          onBackMobile={onBackMobile}
          showBack={showBack}
          auditTab={auditTab}
          onAuditTabChange={setAuditTab}
          onOpenNotes={() => setNotesOpen((o) => !o)}
          compactChrome={compactChrome || shellSidebarCollapsed}
        />
        {notesOpen && threadId ? (
          <InternalNotesPanel threadId={threadId} onClose={() => setNotesOpen(false)} />
        ) : null}
        {auditTab ? (
          <ChatAuditTab threadId={threadId} />
        ) : (
          <div
            key={threadId ?? "none"}
            className="grid min-h-0 min-w-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden motion-safe:animate-[dfInboxPaneEnter_220ms_ease-out] motion-reduce:animate-none"
          >
            <div className="min-w-0 shrink-0">
              <ConversationActionBanner
                thread={activeThread}
                dismissed={actionBannerDismissed}
                onDismiss={() => setActionBannerDismissed(true)}
                onRespondNow={() => {}}
              />
            </div>
            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <MessageList
                threadId={threadId}
                thread={activeThread}
                wideReadingColumn={shellSidebarCollapsed}
              />
            </div>
            <MessageInput
              threadId={threadId}
              thread={activeThread}
              onAgentMessageSent={() => setActionBannerDismissed(true)}
              denseComposer={compactChrome || shellSidebarCollapsed}
            />
          </div>
        )}
      </div>
      {!auditTab && activeThread ? (
        <LeadDataPanel
          thread={activeThread}
          evaluationMode={evaluationMode}
          className={`max-h-40 w-full shrink-0 overflow-y-auto border-t border-slate-200/90 sm:max-h-52 md:max-h-64 xl:max-h-full xl:min-h-0 xl:shrink-0 xl:border-l xl:border-t-0 ${
            shellSidebarCollapsed ? "xl:w-64" : "xl:w-72"
          }`}
        />
      ) : null}
    </div>
  );
}
