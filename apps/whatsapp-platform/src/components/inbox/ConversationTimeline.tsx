"use client";

import { useMemo } from "react";
import type { WaInboxMessageRow } from "./inboxTypes";
import { automationStatusLines } from "./automationStatusCopy";
import { buildOperationalTimelineRows, timelineRowLabel, type TimelineRow } from "./conversationTimelineLogic";

function rowIcon(row: TimelineRow): string {
  if (row.kind === "inbound") return "💬";
  if (row.kind === "outbound_ai") return "🤖";
  if (row.kind === "outbound_automation") return row.sub === "followup" ? "⚡" : "⚡";
  return "👤";
}

export function ConversationTimeline({ messages }: { messages: WaInboxMessageRow[] }) {
  const rows = useMemo(() => buildOperationalTimelineRows(messages), [messages]);

  if (rows.length < 2) return null;

  return (
    <details
      className="group w-full max-w-none rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-sm sm:px-3.5"
      data-testid="conversation-timeline"
    >
      <summary className="cursor-pointer list-none text-left text-xs font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-400 transition-transform group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Resumo da conversa
        </span>
        <span className="ml-2 font-normal text-slate-400">(últimos eventos)</span>
      </summary>
      <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[12px] leading-snug text-slate-700">
        {rows.map((row, i) => (
          <li key={`${row.kind}-${i}-${row.time}`} className="flex gap-2">
            <span className="shrink-0 tabular-nums text-slate-400">[{row.time}]</span>
            <span className="min-w-0">
              <span aria-hidden>{rowIcon(row)}</span>{" "}
              <span data-testid="timeline-line">{timelineRowLabel(row)}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Contexto de automação com base no snapshot da thread (complementa a timeline). */
export function AutomationStatusHints({ thread }: { thread: import("./inboxTypes").WaInboxThreadRow | null }) {
  const hints = thread ? automationStatusLines(thread) : [];
  if (hints.length === 0) return null;
  return (
    <div
      className="w-full max-w-none rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-600 sm:px-3.5"
      data-testid="automation-status-hints"
    >
      {hints.map((h) => (
        <p key={h}>{h}</p>
      ))}
    </div>
  );
}
