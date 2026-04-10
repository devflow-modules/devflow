"use client";

import type { WaInboxThreadRow } from "./inboxTypes";

function priorityEmoji(priority: string | undefined): { icon: string; label: string; className: string } {
  switch (priority) {
    case "HIGH":
      return { icon: "🔥", label: "Alta", className: "text-red-600" };
    case "MEDIUM":
      return { icon: "⚡", label: "Média", className: "text-amber-600" };
    case "LOW":
      return { icon: "💤", label: "Baixa", className: "text-slate-500" };
    default:
      return { icon: "—", label: "—", className: "text-slate-400" };
  }
}

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
  const pr = priorityEmoji(thread.priority);
  const score = thread.leadScore ?? 0;

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
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${pr.className}`}>
            {pr.icon} {pr.label}
          </span>
          <span className="tabular-nums text-sm font-bold text-slate-800" data-testid="lead-score-panel">
            {score} pts
          </span>
        </div>
        {thread.aiState ? (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Funil (IA)</p>
            <span className="inline-flex rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/90">
              {thread.aiState}
            </span>
          </div>
        ) : null}
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
