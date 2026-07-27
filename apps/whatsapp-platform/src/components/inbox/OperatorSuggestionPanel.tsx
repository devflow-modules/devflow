"use client";

import type { WaInboxThreadRow } from "./inboxTypes";
import { generateOperatorSuggestion } from "./operatorSuggestion";

export function OperatorSuggestion({ thread }: { thread: WaInboxThreadRow | null }) {
  const text = thread ? generateOperatorSuggestion(thread) : null;
  if (!text) return null;

  return (
    <div
      className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2.5"
      data-testid="operator-suggestion"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-900/80">Sugestão</p>
      <p className="mt-1 text-sm leading-snug text-sky-950">&ldquo;{text}&rdquo;</p>
    </div>
  );
}
