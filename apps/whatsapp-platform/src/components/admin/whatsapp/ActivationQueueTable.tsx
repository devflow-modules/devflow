"use client";

import { Button } from "@/components/ui/button";
import type { PendingChannelRow, PendingQueueFilter } from "@/modules/whatsapp/channelActivationService";
import { SlaBadge } from "./SlaBadge";

const EMPTY_COPY: Record<PendingQueueFilter, string> = {
  all: "Nenhum canal pendente 🎉",
  ok: "Nenhum canal na faixa OK (menos de 5 min na fila).",
  delay: "Nenhum canal em atraso (5–30 min).",
  critical: "Nenhum canal crítico (mais de 30 min).",
  possibly_stuck: "Nenhum canal possivelmente travado.",
};

type Props = {
  items: PendingChannelRow[];
  loading?: boolean;
  filter: PendingQueueFilter;
  onActivate: (row: PendingChannelRow) => void;
  onRefresh: () => void;
  onOpenTimeline: (row: PendingChannelRow) => void;
};

function rowTone(row: PendingChannelRow): string {
  if (row.lastEvent?.type === "ERROR")
    return "bg-[color:var(--df-danger-bg)] ring-1 ring-[color:var(--df-danger-border)]";
  if (row.slaStatus === "critical")
    return "border-l-4 border-[color:var(--df-danger-sla-border)] bg-[color:var(--df-danger-sla-bg)] ring-1 ring-[color:var(--df-danger-border)]";
  if (row.possiblyStuck) return "bg-[color-mix(in_srgb,var(--df-warning-bg)_45%,transparent)]";
  return "";
}

function priorityHint(row: PendingChannelRow): string {
  if (row.slaStatus === "critical") return "Crítico";
  if (row.possiblyStuck) return "Possível travamento";
  if (row.slaStatus === "delay") return "Em atraso";
  return "OK";
}

function AlertsCell({ row }: { row: PendingChannelRow }) {
  const summary = row.alerts?.map((a) => a.message).join(" · ");
  if (!row.alerts?.length && !row.lastEvent?.type) return <span className="df-text-muted">—</span>;
  return (
    <span
      className="inline-flex max-w-[10rem] cursor-help items-center gap-1 df-text-warning"
      title={summary || row.lastEvent?.message}
    >
      {row.alerts?.some((a) => a.level === "critical") ? (
        <span aria-hidden>🔴</span>
      ) : row.alerts?.length || row.lastEvent?.type === "ERROR" ? (
        <span aria-hidden>⚠️</span>
      ) : (
        <span aria-hidden>ℹ️</span>
      )}
      <span className="line-clamp-2 text-xs">{row.alerts?.[0]?.message ?? row.lastEvent?.message}</span>
    </span>
  );
}

export function ActivationQueueTable({
  items,
  loading,
  filter,
  onActivate,
  onRefresh,
  onOpenTimeline,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2 py-6" data-testid="activation-queue-loading" aria-busy>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-border bg-muted/60/50 py-12 text-center text-sm df-text-secondary"
        data-testid="activation-queue-empty"
      >
        {EMPTY_COPY[filter]}
      </p>
    );
  }

  return (
    <div className="df-table-wrap" data-testid="activation-queue-table">
      <table className="df-table">
        <thead>
          <tr>
            <th>Prioridade</th>
            <th>Alertas</th>
            <th>Telefone</th>
            <th>Tenant / empresa</th>
            <th>Estado</th>
            <th>Criado</th>
            <th>Na fila</th>
            <th>SLA</th>
            <th className="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} data-testid={`pending-row-${row.id}`} className={rowTone(row)}>
              <td className="text-sm">
                <span className="font-mono tabular-nums df-text-primary">{row.priorityScore}</span>
                <span className="ml-2 text-xs df-text-secondary">{priorityHint(row)}</span>
              </td>
              <td>
                <AlertsCell row={row} />
              </td>
              <td className="font-mono text-sm">{row.phoneNumber}</td>
              <td>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium df-text-primary">{row.tenantName}</span>
                  {row.autoHealAttempts >= 2 ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold df-text-primary"
                      title="Limite de tentativas automáticas atingido"
                      data-testid={`auto-heal-limit-${row.id}`}
                    >
                      <span aria-hidden>⛔</span>
                      Limite atingido
                    </span>
                  ) : null}
                  {row.autoHealStatus === "ACTIVE" && row.autoHealCandidate ? (
                    <span
                      className="df-badge-success inline-flex items-center gap-0.5 !px-2 !py-0.5 !text-[10px] !font-semibold !normal-case !tracking-normal"
                      title="Pode executar tentativa automática em segundo plano"
                      data-testid={`auto-heal-active-${row.id}`}
                    >
                      <span aria-hidden>⚙️</span>
                      Auto-healing ativo
                    </span>
                  ) : null}
                  {row.playbookAvailable ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-900"
                      title="Sugestão de resolução disponível na timeline"
                      data-testid={`playbook-hint-${row.id}`}
                    >
                      <span aria-hidden>🧠</span>
                      Sugestão disponível
                    </span>
                  ) : null}
                </div>
                <div className="font-mono text-xs df-text-muted">{row.tenantId}</div>
                {row.possiblyStuck ? (
                  <span
                    className="df-badge-warning mt-1 inline-block !rounded-md !px-2 !py-0.5 !text-xs !font-medium !normal-case !tracking-normal"
                    title="Sem atualização há mais de 15 minutos"
                  >
                    Possível travamento
                  </span>
                ) : null}
              </td>
              <td className="text-xs font-mono">{row.status}</td>
              <td className="whitespace-nowrap text-sm df-text-secondary">
                {new Date(row.createdAt).toLocaleString("pt-PT")}
              </td>
              <td className="tabular-nums text-sm">{row.minutesInQueue} min</td>
              <td>
                <div className="space-y-1">
                  <SlaBadge status={row.slaStatus} urgent={row.slaStatus === "critical"} />
                  {row.slaStatus === "critical" ? (
                    <p className="df-text-error text-[11px] font-semibold uppercase tracking-wide">
                      Ação imediata necessária
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => onOpenTimeline(row)}>
                    Timeline
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onRefresh()}>
                    Atualizar
                  </Button>
                  <Button type="button" size="sm" variant="default" onClick={() => onActivate(row)}>
                    Ativar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
