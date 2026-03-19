"use client";

import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
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
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white" data-testid="chat-window">
      <ChatHeader
        threadId={threadId}
        thread={thread}
        onBackMobile={onBackMobile}
        showBack={showBack}
      />
      <MessageList threadId={threadId} />
      <MessageInput threadId={threadId} />
    </div>
  );
}
