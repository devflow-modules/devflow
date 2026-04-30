"use client";

import { useMemo } from "react";
import type { WaInboxThreadRow } from "./inboxTypes";
import { bannerLabel, computeConversationActionBanner } from "./conversationActionBannerLogic";
import { buttonClassName } from "@/components/ui/button";
import { INBOX_CHAT_GUTTER_X } from "./inboxChatLayout";
import { Button } from "@/components/ui/button";

export function ConversationActionBanner({
  thread,
  dismissed,
  onDismiss,
  onRespondNow,
}: {
  thread: WaInboxThreadRow | null;
  dismissed: boolean;
  onDismiss: () => void;
  onRespondNow: () => void;
}) {
  const variant = useMemo(() => computeConversationActionBanner(thread), [thread]);

  if (dismissed || !variant) return null;

  const prefix =
    variant.kind === "high_wait" ? "🔥" : variant.kind === "negotiation_stalled" ? "⏳" : "👤";
  const text = `${prefix} ${bannerLabel(variant)}`;

  return (
    <div
      className={`shrink-0 df-feedback-warning rounded-none border-x-0 border-t-0 py-3 sm:py-3.5 ${INBOX_CHAT_GUTTER_X}`}
      data-testid="conversation-action-banner"
      role="status"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium">{text}</p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            type="button"
            className={buttonClassName("primary", "text-sm")}
            onClick={() => {
              onRespondNow();
              document.getElementById("inbox-composer-anchor")?.scrollIntoView({ behavior: "smooth", block: "end" });
            }}
            data-testid="banner-respond-now"
          >
            Responder agora
          </Button>
          <Button
            variant="ghost"
            type="button"
            className="text-xs font-medium df-text-warning underline opacity-90 hover:opacity-100"
            onClick={onDismiss}
          >
            Ocultar
          </Button>
        </div>
      </div>
    </div>
  );
}
