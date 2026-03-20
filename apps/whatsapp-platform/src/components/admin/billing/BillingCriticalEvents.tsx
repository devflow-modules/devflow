"use client";

import type { BillingCriticalEvent } from "@/modules/billing/admin/billingDashboardTypes";

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "invoice.payment_failed": "Falha pagamento",
    "usage.limit_exceeded": "Limite excedido",
    "system.error": "Erro sistema",
    "usage.threshold_warning": "Uso ≥80%",
  };
  return labels[type] ?? type;
}

function eventSeverity(type: string): "critical" | "warning" | "error" {
  if (type === "invoice.payment_failed" || type === "system.error")
    return "critical";
  if (type === "usage.limit_exceeded") return "error";
  return "warning";
}

type Props = { events: BillingCriticalEvent[] };

export function BillingCriticalEvents({ events }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium">Tenant</th>
            <th className="text-left p-3 font-medium">Evento</th>
            <th className="text-left p-3 font-medium">Fonte</th>
            <th className="text-left p-3 font-medium">Data</th>
            <th className="text-left p-3 font-medium">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => {
            const severity = eventSeverity(ev.eventType);
            const badgeClass =
              severity === "critical"
                ? "bg-red-100 text-red-800"
                : severity === "error"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-yellow-100 text-yellow-800";
            const metaStr = ev.metadata
              ? JSON.stringify(ev.metadata).slice(0, 80) + (JSON.stringify(ev.metadata).length > 80 ? "…" : "")
              : "—";
            return (
              <tr
                key={ev.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3">
                  {ev.tenantName || ev.tenantId.slice(0, 12)}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}
                  >
                    {eventTypeLabel(ev.eventType)}
                  </span>
                </td>
                <td className="p-3">{ev.source}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(ev.createdAt).toLocaleString("pt-BR")}
                </td>
                <td className="p-3 text-muted-foreground font-mono text-xs max-w-[200px] truncate" title={metaStr}>
                  {metaStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {events.length === 0 && (
        <p className="p-6 text-center text-muted-foreground">
          Nenhum evento crítico no período.
        </p>
      )}
    </div>
  );
}
