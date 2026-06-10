"use client";

import { useCallback, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type { SystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";
import { Button } from "@/components/ui/button";

function formatAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "há segundos";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia(s)`;
}

function summaryBannerClass(overall: SystemHealthSummary["overall"]): string {
  if (overall === "ok") return "df-status-summary-banner--ok";
  if (overall === "attention") return "df-status-summary-banner--attention";
  return "df-status-summary-banner--critical";
}

function summaryStatusLabel(overall: SystemHealthSummary["overall"]): string {
  if (overall === "ok") return "Estado: OK";
  if (overall === "attention") return "Estado: atenção";
  return "Estado: crítico";
}

function rowOk(ok: boolean): string {
  return ok ? "✅" : "❌";
}

function webhookTone(status: SystemHealthSnapshot["webhookHealth"]["status"]): string {
  if (status === "ok") return "df-text-success";
  if (status === "attention") return "df-text-warning";
  return "df-text-error";
}

export function SystemHealthPanel({
  snapshot,
  summary,
  error,
  onRefresh,
}: {
  snapshot: SystemHealthSnapshot | null;
  summary: SystemHealthSummary | null;
  error: string | null;
  onRefresh: () => void;
}) {
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const patchOperations = useCallback(
    async (body: { aiEnabled?: boolean; automationEnabled?: boolean }) => {
      setActionBusy("patch");
      setActionMsg(null);
      try {
        const res = await fetchProtected("/api/admin/operations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
        if (!res.ok) {
          setActionMsg(protectedApiUserMessage(res.status, j));
          return;
        }
        setActionMsg("Alteração guardada.");
        onRefresh();
      } catch {
        setActionMsg("Erro de rede");
      } finally {
        setActionBusy(null);
      }
    },
    [onRefresh]
  );

  const postJson = useCallback(
    async (url: string, busyKey: string, body?: Record<string, unknown>) => {
      setActionBusy(busyKey);
      setActionMsg(null);
      try {
        const res = await fetchProtected(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const j = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: unknown;
          error?: string;
        };
        if (!res.ok) {
          setActionMsg(protectedApiUserMessage(res.status, j));
          return;
        }
        setActionMsg("Pedido concluído.");
        onRefresh();
      } catch {
        setActionMsg("Erro de rede");
      } finally {
        setActionBusy(null);
      }
    },
    [onRefresh]
  );

  if (error) {
    return (
      <section className="df-feedback-error rounded-xl px-4 py-3 text-sm" data-testid="system-health-panel" role="alert">
        <p className="font-medium">Não foi possível carregar a saúde do canal.</p>
        <Button variant="secondary" type="button" className={`${buttonClassName("secondary")} mt-2 text-xs`} onClick={onRefresh}>
          Tentar novamente
        </Button>
      </section>
    );
  }

  if (!snapshot || !summary) {
    return (
      <div className="df-metric-card" data-testid="system-health-panel">
        <div className="h-24 animate-pulse rounded-lg bg-[var(--df-bg-app)]" />
      </div>
    );
  }

  const ch = snapshot.channelStatus;
  const wh = snapshot.webhookHealth;
  const op = snapshot.operationalControls;
  const au = snapshot.automationStatus;
  const statusLabel = summaryStatusLabel(summary.overall);

  return (
    <section
      className="space-y-4"
      data-testid="system-health-panel"
      aria-label="Saúde do canal e automação"
    >
      <div className={summaryBannerClass(summary.overall)}>
        <p className="text-sm font-semibold" aria-label={statusLabel}>
          <span aria-hidden>{summary.overall === "ok" ? "✅" : summary.overall === "attention" ? "⚠️" : "❌"}</span>{" "}
          {summary.message}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="df-metric-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Canal WhatsApp</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--df-text-primary)]">
            <li>
              {rowOk(ch.phoneConnected)} Número conectado{" "}
              {ch.displayPhone ? <span className="text-[var(--df-text-secondary)]">({ch.displayPhone})</span> : null}
            </li>
            <li className="text-[var(--df-text-secondary)]">
              Última mensagem recebida:{" "}
              <span className="font-medium text-[var(--df-text-primary)]">{formatAgo(ch.lastInboundAt)}</span>
            </li>
            <li className="text-[var(--df-text-secondary)]">
              Última mensagem enviada:{" "}
              <span className="font-medium text-[var(--df-text-primary)]">{formatAgo(ch.lastOutboundAt)}</span>
            </li>
            {ch.inboxActivityRecent ? (
              <li className="text-xs text-[var(--df-text-muted)]">Inbox com actividade recente (sinal auxiliar).</li>
            ) : null}
          </ul>
        </div>

        <div className="df-metric-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Webhook</h2>
          <p className={`mt-2 text-sm font-semibold ${webhookTone(wh.status)}`}>{wh.label}</p>
          <p className="mt-1 text-xs text-[var(--df-text-secondary)]">{wh.detail}</p>
          <ul className="mt-3 space-y-1 text-xs text-[var(--df-text-secondary)]">
            <li>Última recepção: {formatAgo(wh.lastReceivedAt)}</li>
            <li>Último sucesso: {formatAgo(wh.lastSuccessAt)}</li>
            <li>Último erro: {formatAgo(wh.lastErrorAt)}</li>
            <li>
              Totais: {wh.totalReceived} ok / {wh.totalErrors} erros
            </li>
          </ul>
        </div>
      </div>

      <div className="df-metric-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Estado operacional</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--df-text-primary)]">
          <li>
            <span className="font-medium">{au.aiLabel}</span>
          </li>
          <li>
            <span className="font-medium">{au.automationLabel}</span>
          </li>
          <li className="text-xs text-[var(--df-text-muted)]">
            Controlos abaixo alteram só a camada operacional (não apagam a configuração da IA nas definições).
          </li>
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="df-metric-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Erros (24 horas)</h2>
          <p className="mt-2 text-sm text-[var(--df-text-primary)]">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                snapshot.errorSummary.count24h > 0 ? "df-badge-error" : "df-badge-success"
              }`}
              data-testid="health-error-count"
            >
              {snapshot.errorSummary.count24h} erro(s)
            </span>
          </p>
          {snapshot.errorSummary.lastThree.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-xs text-[var(--df-text-secondary)]">
              <li className="font-medium text-[var(--df-text-secondary)]">Últimos registos:</li>
              {snapshot.errorSummary.lastThree.map((e) => (
                <li key={e.at + e.message} className="border-l-2 border-[color:var(--df-danger-border)] pl-2">
                  {formatAgo(e.at)} — {e.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--df-text-muted)]">Nenhum erro de IA nas últimas 24 horas.</p>
          )}
        </div>

        <div className="df-metric-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Tarefas automáticas</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--df-text-primary)]" data-testid="health-task-counts">
            <li>
              Follow-ups agendados:{" "}
              <span className="font-semibold tabular-nums">{snapshot.taskCounts.followUpPending}</span>
            </li>
            <li>
              Reativações pendentes:{" "}
              <span className="font-semibold tabular-nums">{snapshot.taskCounts.reactivationPending}</span>
            </li>
            <li>
              Recuperações pendentes:{" "}
              <span className="font-semibold tabular-nums">{snapshot.taskCounts.recoveryPending}</span>
            </li>
          </ul>
        </div>
      </div>

      {snapshot.criticalLogs.length > 0 ? (
        <div className="df-metric-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Eventos importantes</h2>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-[var(--df-text-secondary)]">
            {snapshot.criticalLogs.map((log) => (
              <li
                key={log.at + log.message}
                className={
                  log.tone === "error"
                    ? "border-l-2 border-[color:var(--df-danger-border)] pl-2"
                    : "border-l-2 border-[color:var(--df-warning-border)] pl-2"
                }
              >
                <span className="text-[var(--df-text-muted)]">{new Date(log.at).toLocaleString("pt-BR")}</span> — {log.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Controles</h2>
        <p className="mt-1 text-xs text-[var(--df-text-muted)]">
          Pausas aplicam-se à automação; o inbox manual dos agentes continua disponível.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null || !op.aiEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ aiEnabled: false })}
          >
            {actionBusy === "patch" ? "…" : "Pausar IA"}
          </Button>
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null || op.aiEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ aiEnabled: true })}
          >
            {actionBusy === "patch" ? "…" : "Ativar IA"}
          </Button>
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null || !op.automationEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ automationEnabled: false })}
          >
            Pausar automação
          </Button>
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null || op.automationEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ automationEnabled: true })}
          >
            Ativar automação
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t df-border-brand pt-3">
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null}
            className={buttonClassName("primary", "text-xs")}
            onClick={() => void postJson("/api/admin/run-worker", "worker", { limit: 25 })}
          >
            {actionBusy === "worker" ? "…" : "Rodar worker agora"}
          </Button>
          <Button variant="disabled"
            type="button"
            disabled={actionBusy !== null}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void postJson("/api/admin/reprocess-followups", "reprocess")}
          >
            {actionBusy === "reprocess" ? "…" : "Reprocessar pendências"}
          </Button>
        </div>
        {actionMsg ? <p className="mt-2 text-xs text-[var(--df-text-secondary)]">{actionMsg}</p> : null}
      </div>
    </section>
  );
}
