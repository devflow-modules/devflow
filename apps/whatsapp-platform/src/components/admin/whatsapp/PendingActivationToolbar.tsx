"use client";

import Link from "next/link";
import type { PendingQueueFilter, SlaBuckets } from "@/modules/whatsapp/channelActivationService";

type Props = {
  buckets: SlaBuckets | null;
  activeFilter: PendingQueueFilter;
};

function chipClass(active: boolean, tone: "ok" | "delay" | "critical" | "neutral") {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
  if (active) {
    if (tone === "ok") return `${base} border-emerald-300 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-400/40`;
    if (tone === "delay") return `${base} border-amber-300 bg-amber-100 text-amber-950 ring-2 ring-amber-400/40`;
    if (tone === "critical") return `${base} border-red-300 bg-red-100 text-red-950 ring-2 ring-red-400/40`;
    return `${base} border-slate-400 bg-slate-900 text-white`;
  }
  if (tone === "ok") return `${base} border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50`;
  if (tone === "delay") return `${base} border-amber-200 bg-white text-amber-900 hover:bg-amber-50`;
  if (tone === "critical") return `${base} border-red-200 bg-white text-red-900 hover:bg-red-50`;
  return `${base} border-slate-200 bg-white text-slate-800 hover:bg-slate-50`;
}

function hrefForFilter(f: PendingQueueFilter): string {
  if (f === "all") return "/admin/whatsapp?view=pending";
  return `/admin/whatsapp?view=pending&filter=${encodeURIComponent(f)}`;
}

/**
 * Resumo SLA (pendentes) + atalhos de filtro alinhados aos buckets.
 */
export function PendingActivationToolbar({ buckets, activeFilter }: Props) {
  return (
    <div className="space-y-3">
      <p className="df-label text-slate-600">Fila pendente — SLA</p>
      <div className="flex flex-wrap gap-2" data-testid="pending-sla-summary">
        <Link
          href={hrefForFilter("all")}
          className={chipClass(activeFilter === "all", "neutral")}
          data-testid="filter-chip-all"
        >
          Todos os pendentes
          {buckets != null ? (
            <span className="tabular-nums text-slate-600">
              ({buckets.ok + buckets.delay + buckets.critical})
            </span>
          ) : null}
        </Link>
        <Link href={hrefForFilter("ok")} className={chipClass(activeFilter === "ok", "ok")} data-testid="filter-chip-ok">
          OK
          {buckets != null ? <span className="tabular-nums opacity-90">({buckets.ok})</span> : null}
        </Link>
        <Link
          href={hrefForFilter("delay")}
          className={chipClass(activeFilter === "delay", "delay")}
          data-testid="filter-chip-delay"
        >
          Delay
          {buckets != null ? <span className="tabular-nums opacity-90">({buckets.delay})</span> : null}
        </Link>
        <Link
          href={hrefForFilter("critical")}
          className={chipClass(activeFilter === "critical", "critical")}
          data-testid="filter-chip-critical"
        >
          Critical
          {buckets != null ? <span className="tabular-nums opacity-90">({buckets.critical})</span> : null}
        </Link>
        <Link
          href={hrefForFilter("possibly_stuck")}
          className={chipClass(activeFilter === "possibly_stuck", "neutral")}
          data-testid="filter-chip-stuck"
        >
          Possivelmente travados
        </Link>
      </div>
    </div>
  );
}
