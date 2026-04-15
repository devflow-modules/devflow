"use client";

import Link from "next/link";
import { Button } from "@devflow/ui";
import { AppBadge } from "@/components/ui/app-badge";
import type { AdminWhatsappChannelRow, WhatsappChannelStatus } from "./types";

function StatusBadge({ status }: { status: WhatsappChannelStatus }) {
  if (status === "ACTIVE") {
    return <AppBadge variant="success">ACTIVE</AppBadge>;
  }
  if (status === "PENDING_ACTIVATION") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
        PENDING_ACTIVATION
      </span>
    );
  }
  return <AppBadge variant="danger">ERROR</AppBadge>;
}

function ReadyCell({ row }: { row: AdminWhatsappChannelRow }) {
  if (row.readyForOutbound) {
    return <span className="text-sm text-emerald-800">✅ Pronto</span>;
  }
  if (row.status === "ACTIVE" && !row.hasToken) {
    return <span className="text-sm text-amber-800">⚠️ Token ausente</span>;
  }
  return <span className="text-sm text-red-800">❌ Não ativo</span>;
}

type Props = {
  rows: AdminWhatsappChannelRow[];
  loading?: boolean;
  onActivate: (row: AdminWhatsappChannelRow) => void;
  onCopy: (label: string, value: string) => void;
  onRefresh: () => void;
  onOpenTimeline?: (row: AdminWhatsappChannelRow) => void;
};

export function AdminWhatsappChannelsTable({ rows, loading, onActivate, onCopy, onRefresh, onOpenTimeline }: Props) {
  if (loading) {
    return <p className="df-text-muted py-8 text-center">A carregar canais…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="df-text-muted rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm">
        Nenhum canal registado. Use o formulário acima para provisionar.
      </p>
    );
  }

  return (
    <div className="df-table-wrap" data-testid="admin-whatsapp-channels-table">
      <table className="df-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Telefone</th>
            <th>Status</th>
            <th>Token</th>
            <th>Pronto p/ envio</th>
            <th>Última atualização</th>
            <th className="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pending = row.status === "PENDING_ACTIVATION";
            return (
              <tr
                key={row.id}
                className={pending ? "bg-amber-50/40" : undefined}
                data-testid={`channel-row-${row.id}`}
                data-status={row.status}
              >
                <td>
                  <div className="font-medium text-slate-900">{row.tenantName}</div>
                  <div className="font-mono text-xs text-slate-500">{row.tenantId}</div>
                </td>
                <td className="font-mono text-sm">{row.phone}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>
                  {row.hasToken ? (
                    <AppBadge variant="success">Presente</AppBadge>
                  ) : (
                    <AppBadge variant="muted">Ausente</AppBadge>
                  )}
                </td>
                <td>
                  <ReadyCell row={row} />
                </td>
                <td className="whitespace-nowrap text-sm text-slate-600">
                  {new Date(row.updatedAt).toLocaleString("pt-PT")}
                </td>
                <td className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {onOpenTimeline ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenTimeline(row)}
                      >
                        Timeline
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      asChild
                      title="Painel WhatsApp (sessão atual — não muda de tenant)"
                    >
                      <Link href="/dashboard/whatsapp">Painel</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onCopy("Phone Number ID", row.phoneNumberId)}
                    >
                      Copiar PNID
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => row.wabaId && onCopy("WABA ID", row.wabaId)}
                      disabled={!row.wabaId}
                    >
                      Copiar WABA
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => onRefresh()}>
                      Atualizar
                    </Button>
                    {!(row.status === "ACTIVE" && row.hasToken) ? (
                      <Button type="button" size="sm" variant="default" onClick={() => onActivate(row)}>
                        Ativar
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
