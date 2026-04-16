"use client";

import { useMemo } from "react";
import type { WaInboxThreadRow } from "./inboxTypes";
import { bannerLabel, computeConversationActionBanner } from "./conversationActionBannerLogic";
import { buttonClassName } from "@/components/ui/button";
import { INBOX_CHAT_GUTTER_X } from "./inboxChatLayout";

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
      className={`shrink-0 border-b border-amber-200/90 bg-gradient-to-r from-amber-50 to-amber-50/40 py-3 sm:py-3.5 ${INBOX_CHAT_GUTTER_X}`}
      data-testid="conversation-action-banner"
      role="status"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-amber-950">{text}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={buttonClassName("primary", "text-sm")}
            onClick={() => {
              onRespondNow();
              document.getElementById("inbox-composer-anchor")?.scrollIntoView({ behavior: "smooth", block: "end" });
            }}
            data-testid="banner-respond-now"
          >
            Responder agora
          </button>
          <button type="button" className="text-xs font-medium text-amber-900/70 underline" onClick={onDismiss}>
            Ocultar
          </button>
        </div>
      </div>
    </div>
  );
}
