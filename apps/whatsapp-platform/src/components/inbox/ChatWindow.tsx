"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  };
}

export function ChatWindow({
  threadId,
  thread,
  onBackMobile,
  showBack,
}: {
  threadId: string | null;
  thread: WaInboxThreadRow | null;
  onBackMobile?: () => void;
  showBack?: boolean;
}) {
  const [auditTab, setAuditTab] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const prevThreadIdRef = useRef<string | null>(null);

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
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white via-slate-50/30 to-slate-50/60 xl:flex-row"
      data-testid="chat-window"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader
          threadId={threadId}
          thread={activeThread}
          onBackMobile={onBackMobile}
          showBack={showBack}
          auditTab={auditTab}
          onAuditTabChange={setAuditTab}
          onOpenNotes={() => setNotesOpen((o) => !o)}
        />
        {notesOpen && threadId ? (
          <InternalNotesPanel threadId={threadId} onClose={() => setNotesOpen(false)} />
        ) : null}
        {auditTab ? (
          <ChatAuditTab threadId={threadId} />
        ) : (
          <>
            <MessageList threadId={threadId} thread={activeThread} />
            <MessageInput threadId={threadId} thread={activeThread} />
          </>
        )}
      </div>
      {!auditTab && activeThread ? (
        <LeadDataPanel
          thread={activeThread}
          className="max-h-40 w-full shrink-0 overflow-y-auto border-t border-slate-200/90 sm:max-h-52 md:max-h-64 xl:max-h-[min(100vh,720px)] xl:w-72 xl:border-l xl:border-t-0"
        />
      ) : null}
    </div>
  );
}
