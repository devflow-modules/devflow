"use client";

import type { InboxProspectLens } from "@/modules/inbox/inboxProspectLens";
import { INBOX_PROSPECT_LENS, INBOX_PROSPECT_LENS_LABELS } from "@/modules/inbox/inboxProspectLens";
import type { InboxProspectMetricsRow } from "@/modules/inbox/waInboxProspectMetrics";
import { Button } from "@/components/ui/button";

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
      className="border-b df-border-brand bg-muted/60/90 px-2 py-2"
      data-testid="inbox-prospect-metrics-bar"
      role="toolbar"
      aria-label="Métricas de prospecção"
    >
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide df-text-muted">Prospecção (abertas)</p>
      <div className="flex flex-wrap gap-1">
        <Button variant="secondary"
          type="button"
          onClick={() => onLensChange(null)}
          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ring-1 transition ${
            activeLens === null
              ? "bg-muted text-white ring-slate-700"
              : "bg-card df-text-secondary ring-slate-200 hover:bg-muted"
          }`}
        >
          Todas <span className="tabular-nums opacity-80">({metrics.totalOpen})</span>
        </Button>
        {INBOX_PROSPECT_LENS.map((lens) => {
          const count = metrics[LENS_TO_COUNT[lens]];
          const active = activeLens === lens;
          return (
            <Button variant="secondary"
              key={lens}
              type="button"
              onClick={() => onLensChange(active ? null : lens)}
              className={`rounded-md px-1.5 py-1 text-[10px] font-semibold ring-1 transition ${
                active
                  ? "bg-[var(--df-brand-600)] text-white ring-[var(--df-brand-500)]"
                  : "bg-card df-text-secondary ring-slate-200 hover:bg-[var(--df-brand-50)]"
              }`}
              title={INBOX_PROSPECT_LENS_LABELS[lens]}
            >
              {INBOX_PROSPECT_LENS_LABELS[lens]}{" "}
              <span className="tabular-nums opacity-90">({count})</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
