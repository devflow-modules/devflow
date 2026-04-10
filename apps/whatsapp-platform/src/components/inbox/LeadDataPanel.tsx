"use client";

import type { WaInboxThreadRow } from "./inboxTypes";
import { OperatorSuggestion } from "./OperatorSuggestion";
import { aiStateFriendlyLabel, leadScoreHumanLabel, priorityGuidance } from "./leadPanelCopy";

function row(label: string, value: string | undefined | null) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

export function LeadDataPanel({
  thread,
  className = "",
}: {
  thread: WaInboxThreadRow | null;
  className?: string;
}) {
  if (!thread) return null;
  const ld = thread.leadData;
  const score = thread.leadScore ?? 0;
  const scoreLabel = leadScoreHumanLabel(score);
  const stateLabel = aiStateFriendlyLabel(thread.aiState);
  const pg = priorityGuidance(thread.priority);

  return (
    <aside
      className={`flex flex-col border-slate-200/90 bg-slate-50/50 ${className}`}
      aria-label="Dados do lead"
      data-testid="lead-data-panel"
    >
      <div className="border-b border-slate-200/80 px-3 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Dados do lead</h3>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-left">
        <div className="space-y-2 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
          <p className="text-sm text-slate-900" data-testid="lead-score-panel">
            <span className="font-bold tabular-nums">{score}</span>
            <span className="text-slate-600"> — {scoreLabel}</span>
          </p>
          {stateLabel ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estado</p>
              <p className="text-sm text-slate-900">{stateLabel}</p>
            </div>
          ) : null}
          {pg ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prioridade</p>
              <p className="text-sm text-slate-900" title={pg.tooltip}>
                {thread.priority === "HIGH" ? "🔥 HIGH" : thread.priority === "MEDIUM" ? "⚡ MEDIUM" : "💤 LOW"} →{" "}
                <span className="font-medium">{pg.line}</span>
              </p>
            </div>
          ) : null}
        </div>

        <OperatorSuggestion thread={thread} />

        {row("Nome", ld?.name)}
        {row("Interesse", ld?.interest)}
        {row("Orçamento", ld?.budget)}
        {row("Urgência", ld?.urgency)}
        {!ld?.name && !ld?.interest && !ld?.budget && !ld?.urgency ? (
          <p className="text-xs text-slate-500">Ainda não há dados extraídos das mensagens.</p>
        ) : null}
      </div>
    </aside>
  );
}
