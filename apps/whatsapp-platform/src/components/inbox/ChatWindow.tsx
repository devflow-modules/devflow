"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { ChatAuditTab } from "./ChatAuditTab";
import { InternalNotesPanel } from "./InternalNotesPanel";
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
    setNotesOpen(false);
  }, [threadId]);

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
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white via-slate-50/30 to-slate-50/60"
      data-testid="chat-window"
    >
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
  );
}
