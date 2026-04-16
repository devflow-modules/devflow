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
import { useMediaMinWidth } from "@/lib/useMediaMinWidth";

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
  inboxFocusMode = false,
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
  /** Modo foco inbox — oculta painel CRM (excepto avaliação guiada). */
  inboxFocusMode?: boolean;
}) {
  const [auditTab, setAuditTab] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [actionBannerDismissed, setActionBannerDismissed] = useState(false);
  const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
  const prevThreadIdRef = useRef<string | null>(null);
  const isMd = useMediaMinWidth(768, false);
  const isXl = useMediaMinWidth(1280, false);
  const showCrmChrome = !inboxFocusMode || evaluationMode;
  const crmStack = showCrmChrome && !isMd;
  const crmDrawerMode = showCrmChrome && isMd && !isXl;
  const crmSide = showCrmChrome && isXl;

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

  useEffect(() => {
    setCrmDrawerOpen(false);
  }, [threadId]);

  useEffect(() => {
    if (!crmDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCrmDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [crmDrawerOpen]);

  const leadSideClass = `hidden max-h-full min-h-0 shrink-0 overflow-y-auto border-l border-slate-200/90 xl:flex ${
    shellSidebarCollapsed ? "xl:w-[260px] xl:max-w-[260px]" : "xl:w-[280px] xl:min-w-[260px] xl:max-w-[280px]"
  }`;

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
          compactChrome={compactChrome || shellSidebarCollapsed || inboxFocusMode}
        />
        {notesOpen && threadId ? (
          <InternalNotesPanel threadId={threadId} onClose={() => setNotesOpen(false)} />
        ) : null}
        {auditTab ? (
          <ChatAuditTab threadId={threadId} />
        ) : (
          <div
            key={threadId ?? "none"}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden motion-safe:animate-[dfInboxPaneEnter_220ms_ease-out] motion-reduce:animate-none"
          >
            <div className="min-w-0 shrink-0">
              <ConversationActionBanner
                thread={activeThread}
                dismissed={actionBannerDismissed}
                onDismiss={() => setActionBannerDismissed(true)}
                onRespondNow={() => {}}
              />
            </div>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <MessageList threadId={threadId} thread={activeThread} />
            </div>
            {!auditTab && activeThread && crmDrawerMode ? (
              <div className="hidden shrink-0 border-t border-slate-200/85 bg-white/95 px-3 py-2 md:block xl:hidden">
                <button
                  type="button"
                  onClick={() => setCrmDrawerOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
                >
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Contexto CRM
                </button>
              </div>
            ) : null}
            <MessageInput
              threadId={threadId}
              thread={activeThread}
              onAgentMessageSent={() => setActionBannerDismissed(true)}
              denseComposer={compactChrome || shellSidebarCollapsed || inboxFocusMode}
            />
          </div>
        )}
      </div>
      {!auditTab && activeThread && crmStack ? (
        <LeadDataPanel
          thread={activeThread}
          evaluationMode={evaluationMode}
          className="flex w-full shrink-0 overflow-y-auto border-t border-slate-200/90 md:hidden max-h-[min(42vh,22rem)] sm:max-h-[min(44vh,24rem)]"
        />
      ) : null}
      {!auditTab && activeThread && crmSide ? (
        <LeadDataPanel thread={activeThread} evaluationMode={evaluationMode} className={leadSideClass} />
      ) : null}
      {!auditTab && activeThread && crmDrawerOpen && crmDrawerMode ? (
        <div className="fixed inset-0 z-[45] md:block xl:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity"
            aria-label="Fechar painel CRM"
            onClick={() => setCrmDrawerOpen(false)}
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[min(22rem,92vw)] max-w-full flex-col border-l border-slate-200/90 bg-white shadow-[0_0_40px_rgba(15,23,42,0.12)] motion-safe:animate-[dfInboxPaneEnter_200ms_ease-out] motion-reduce:animate-none"
            role="dialog"
            aria-modal="true"
            aria-label="Contexto CRM"
          >
            <LeadDataPanel
              thread={activeThread}
              evaluationMode={evaluationMode}
              className="flex min-h-0 flex-1 flex-col border-0"
              onClose={() => setCrmDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
