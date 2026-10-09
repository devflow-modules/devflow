"use client";

import { AlertTriangle, Bot, Clock, MessageCircle, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardHighlight = "bot" | "human" | "queue" | "waiting" | "opportunity" | null;

type DemoOperationalDashboardProps = {
  highlight?: DashboardHighlight;
  className?: string;
};

const metrics = [
  {
    id: "messages" as const,
    label: "Inbox",
    value: "Compartilhado",
    icon: MessageCircle,
    color: "df-status-brand",
    highlightKey: null,
  },
  {
    id: "bot" as const,
    label: "Automação",
    value: "No repetitivo",
    icon: Bot,
    color: "df-status-info",
    highlightKey: "bot" as const,
  },
  {
    id: "human" as const,
    label: "Em atendimento",
    value: "Com Bruno",
    icon: Users,
    color: "df-status-warning",
    highlightKey: "human" as const,
  },
  {
    id: "queue" as const,
    label: "Precisa resposta",
    value: "Sem responsável",
    icon: AlertTriangle,
    color: "df-status-danger",
    highlightKey: "queue" as const,
  },
  {
    id: "waiting" as const,
    label: "Aguardando",
    value: "Na fila",
    icon: Clock,
    color: "df-status-warning",
    highlightKey: "waiting" as const,
  },
  {
    id: "opportunity" as const,
    label: "Transferido",
    value: "Para Carla",
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
      aria-label="Painel ilustrativo da operação"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide df-text-muted">
          Demonstração da plataforma
        </p>
        <span className="rounded-full df-bg-brand-soft px-2 py-0.5 text-[10px] font-semibold df-status-brand">
          Dados ilustrativos
        </span>
      </div>
      <p className="df-text-secondary mt-1 text-xs leading-relaxed">
        Simulação do estado das conversas: responsável, fila e handoff. Não é uma operação de cliente.
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
              <p className={cn("mt-1 text-sm font-bold leading-snug", m.color)}>{m.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border df-bg-brand-soft px-3 py-2.5">
        <p className="text-[11px] font-semibold df-status-brand">WhatsApp Cloud API oficial</p>
        <p className="df-text-secondary mt-0.5 text-[10px] leading-relaxed">
          IA no repetitivo · handoff para uma pessoa · fila · histórico
        </p>
      </div>
    </aside>
  );
}
