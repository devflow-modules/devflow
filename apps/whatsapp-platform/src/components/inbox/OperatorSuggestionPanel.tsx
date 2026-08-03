"use client";

import type { WaInboxThreadRow } from "./inboxTypes";
import { generateOperatorSuggestion } from "./operatorSuggestion";

export function OperatorSuggestion({ thread }: { thread: WaInboxThreadRow | null }) {
  const text = thread ? generateOperatorSuggestion(thread) : null;
  if (!text) return null;

  return (
    <div className="df-feedback-info !px-3 !py-2.5" data-testid="operator-suggestion">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Sugestão</p>
      <p className="mt-1 text-sm leading-snug text-[var(--df-text-primary)]">&ldquo;{text}&rdquo;</p>
    </div>
  );
}
