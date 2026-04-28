"use client";

import type { InboxProspectLens } from "@/modules/inbox/inboxProspectLens";
import { INBOX_PROSPECT_LENS, INBOX_PROSPECT_LENS_LABELS } from "@/modules/inbox/inboxProspectLens";
import type { InboxProspectMetricsRow } from "@/modules/inbox/waInboxProspectMetrics";

const LENS_TO_COUNT: Record<InboxProspectLens, keyof InboxProspectMetricsRow> = {
  followup_due: "followupDue",
  proposal_open: "proposalOpen",
  diagnosis_scheduled: "diagnosisScheduled",
  hot_lead: "hotLead",
  pending_inbound: "pendingInbound",
};

export function InboxProspectMetricsBar({
  metrics,
  activeLens,
  onLensChange,
}: {
  metrics?: InboxProspectMetricsRow;
  activeLens: InboxProspectLens | null;
  onLensChange: (lens: InboxProspectLens | null) => void;
}) {
  if (!metrics) return null;

  return (
    <div
      className="border-b df-border-brand bg-slate-50/90 px-2 py-2"
      data-testid="inbox-prospect-metrics-bar"
      role="toolbar"
      aria-label="Métricas de prospecção"
    >
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Prospecção (abertas)</p>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onLensChange(null)}
          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ring-1 transition ${
            activeLens === null
              ? "bg-slate-800 text-white ring-slate-700"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          Todas <span className="tabular-nums opacity-80">({metrics.totalOpen})</span>
        </button>
        {INBOX_PROSPECT_LENS.map((lens) => {
          const count = metrics[LENS_TO_COUNT[lens]];
          const active = activeLens === lens;
          return (
            <button
              key={lens}
              type="button"
              onClick={() => onLensChange(active ? null : lens)}
              className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ring-1 transition ${
                active
                  ? "bg-[var(--df-brand-600)] text-white ring-[var(--df-brand-500)]"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-[var(--df-brand-50)]"
              }`}
              title={INBOX_PROSPECT_LENS_LABELS[lens]}
            >
              {INBOX_PROSPECT_LENS_LABELS[lens]}{" "}
              <span className="tabular-nums opacity-90">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
