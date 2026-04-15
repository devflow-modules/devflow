"use client";

import { Button } from "@devflow/ui";
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
  if (row.lastEvent?.type === "ERROR") return "bg-rose-50/60 ring-1 ring-rose-200/80";
  if (row.slaStatus === "critical") return "border-l-4 border-red-600 bg-red-50/40 ring-1 ring-red-200/60";
  if (row.possiblyStuck) return "bg-amber-50/45";
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
  if (!row.alerts?.length && !row.lastEvent?.type) return <span className="text-slate-400">—</span>;
  return (
    <span
      className="inline-flex max-w-[10rem] cursor-help items-center gap-1 text-amber-800"
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
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-700"
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
                <span className="font-mono tabular-nums text-slate-800">{row.priorityScore}</span>
                <span className="ml-2 text-xs text-slate-600">{priorityHint(row)}</span>
              </td>
              <td>
                <AlertsCell row={row} />
              </td>
              <td className="font-mono text-sm">{row.phoneNumber}</td>
              <td>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-slate-900">{row.tenantName}</span>
                  {row.autoHealAttempts >= 2 ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800"
                      title="Limite de tentativas automáticas atingido"
                      data-testid={`auto-heal-limit-${row.id}`}
                    >
                      <span aria-hidden>⛔</span>
                      Limite atingido
                    </span>
                  ) : null}
                  {row.autoHealStatus === "ACTIVE" && row.autoHealCandidate ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-950"
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
                <div className="font-mono text-xs text-slate-500">{row.tenantId}</div>
                {row.possiblyStuck ? (
                  <span
                    className="mt-1 inline-block rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-950"
                    title="Sem atualização há mais de 15 minutos"
                  >
                    Possível travamento
                  </span>
                ) : null}
              </td>
              <td className="text-xs font-mono">{row.status}</td>
              <td className="whitespace-nowrap text-sm text-slate-600">
                {new Date(row.createdAt).toLocaleString("pt-PT")}
              </td>
              <td className="tabular-nums text-sm">{row.minutesInQueue} min</td>
              <td>
                <div className="space-y-1">
                  <SlaBadge status={row.slaStatus} urgent={row.slaStatus === "critical"} />
                  {row.slaStatus === "critical" ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800">
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
