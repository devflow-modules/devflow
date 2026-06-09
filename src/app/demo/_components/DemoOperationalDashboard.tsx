"use client";

import { AlertTriangle, Bot, Clock, MessageCircle, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardHighlight = "bot" | "human" | "sla" | "waiting" | "opportunity" | null;

type DemoOperationalDashboardProps = {
  highlight?: DashboardHighlight;
  className?: string;
};

const metrics = [
  {
    id: "messages" as const,
    label: "Msg 24h",
    value: "847",
    icon: MessageCircle,
    color: "df-status-brand",
    highlightKey: null,
  },
  {
    id: "bot" as const,
    label: "Resolvidas pelo bot",
    value: "612",
    sub: "72%",
    icon: Bot,
    color: "df-status-info",
    highlightKey: "bot" as const,
  },
  {
    id: "human" as const,
    label: "Em atendimento humano",
    value: "18",
    icon: Users,
    color: "df-status-warning",
    highlightKey: "human" as const,
  },
  {
    id: "sla" as const,
    label: "SLA em risco",
    value: "3",
    icon: AlertTriangle,
    color: "df-status-danger",
    highlightKey: "sla" as const,
  },
  {
    id: "waiting" as const,
    label: "Aguardando",
    value: "7",
    icon: Clock,
    color: "df-status-warning",
    highlightKey: "waiting" as const,
  },
  {
    id: "opportunity" as const,
    label: "Oportunidades preservadas",
    value: "5",
    icon: TrendingUp,
    color: "df-status-success",
    highlightKey: "opportunity" as const,
  },
];

export function DemoOperationalDashboard({
  highlight = null,
  className,
}: DemoOperationalDashboardProps) {
  return (
    <aside
      className={cn(
        "df-surface-elevated rounded-xl p-4 shadow-sm sm:p-5",
        className
      )}
      aria-label="Dashboard operacional simulado"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide df-text-muted">
          Dashboard operacional
        </p>
        <span className="rounded-full df-bg-brand-soft px-2 py-0.5 text-[10px] font-semibold df-status-brand">
          Simulação
        </span>
      </div>
      <p className="df-text-secondary mt-1 text-xs leading-relaxed">
        Visão em tempo real — fila, SLA, bot vs humano e oportunidades comerciais.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((m) => {
          const isHighlighted = highlight !== null && m.highlightKey === highlight;
          return (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border border-border/60 bg-muted/25 p-2.5 transition-colors",
                isHighlighted && "border-[var(--devflow-border-brand)] df-bg-brand-soft ring-1 ring-[color-mix(in_srgb,var(--devflow-brand)_20%,transparent)]"
              )}
            >
              <div className="flex items-center gap-1.5">
                <m.icon className={cn("size-3.5 shrink-0", m.color)} aria-hidden />
                <p className="df-text-secondary truncate text-[10px] font-medium">{m.label}</p>
              </div>
              <p className={cn("mt-1 text-lg font-bold leading-none", m.color)}>{m.value}</p>
              {m.sub && <p className="df-text-muted mt-0.5 text-[10px]">{m.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border df-bg-brand-soft px-3 py-2.5">
        <p className="text-[11px] font-semibold df-status-brand">WhatsApp Cloud API oficial</p>
        <p className="df-text-secondary mt-0.5 text-[10px] leading-relaxed">
          IA no repetitivo · handoff humano · fila priorizada · SLA rastreável
        </p>
      </div>
    </aside>
  );
}
