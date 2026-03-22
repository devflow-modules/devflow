"use client";

import { useEffect, useRef, useState } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { ChatAuditTab } from "./ChatAuditTab";
import { reportViewing } from "./inboxFetch";
import type { WaInboxThreadRow } from "./inboxTypes";

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
  const prevThreadIdRef = useRef<string | null>(null);

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
    <div className="flex min-h-0 flex-1 flex-col bg-white" data-testid="chat-window">
      <ChatHeader
        threadId={threadId}
        thread={thread}
        onBackMobile={onBackMobile}
        showBack={showBack}
        auditTab={auditTab}
        onAuditTabChange={setAuditTab}
      />
      {auditTab ? (
        <ChatAuditTab threadId={threadId} />
      ) : (
        <>
          <MessageList threadId={threadId} />
          <MessageInput threadId={threadId} />
        </>
      )}
    </div>
  );
}
