"use client";

import Link from "next/link";
import type { PendingQueueFilter, SlaBuckets } from "@/modules/whatsapp/channelActivationService";

type Props = {
  buckets: SlaBuckets | null;
  activeFilter: PendingQueueFilter;
};

function chipClass(active: boolean, tone: "ok" | "delay" | "critical" | "neutral") {
  const sizing =
    "!px-3 !py-1.5 !text-xs !font-medium !normal-case !tracking-normal";
  const base = `inline-flex items-center gap-1.5 rounded-full transition-colors ${sizing}`;
  if (active) {
    if (tone === "ok") return `${base} df-badge-success ring-2 ring-[color:rgb(16_185_129/0.45)]`;
    if (tone === "delay") return `${base} df-badge-warning ring-2 ring-[color:rgb(245_158_11/0.45)]`;
    if (tone === "critical") return `${base} df-badge-error ring-2 ring-[color:rgb(248_113_113/0.45)]`;
    return `${base} df-border-dark bg-muted text-white`;
  }
  if (tone === "ok")
    return `${base} border border-[color:rgb(16_185_129/0.35)] bg-card df-text-success hover:bg-[color:rgb(16_185_129/0.08)]`;
  if (tone === "delay")
    return `${base} border border-[color:rgb(245_158_11/0.35)] bg-card df-text-warning hover:bg-[color:rgb(245_158_11/0.08)]`;
  if (tone === "critical")
    return `${base} border border-[color:rgb(248_113_113/0.35)] bg-card df-text-error hover:bg-[color:rgb(248_113_113/0.08)]`;
  return `${base} border-border bg-card df-text-primary hover:bg-muted/60`;
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
      <p className="df-label df-text-secondary">Fila pendente — SLA</p>
      <div className="flex flex-wrap gap-2" data-testid="pending-sla-summary">
        <Link
          href={hrefForFilter("all")}
          className={chipClass(activeFilter === "all", "neutral")}
          data-testid="filter-chip-all"
        >
          Todos os pendentes
          {buckets != null ? (
            <span className="tabular-nums df-text-secondary">
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
