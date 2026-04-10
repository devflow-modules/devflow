"use client";

import { useCallback, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type { SystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";

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

function statusDot(overall: SystemHealthSummary["overall"]): { emoji: string; className: string } {
  if (overall === "ok") return { emoji: "✅", className: "text-emerald-700" };
  if (overall === "attention") return { emoji: "⚠️", className: "text-amber-700" };
  return { emoji: "❌", className: "text-red-700" };
}

function rowOk(ok: boolean): string {
  return ok ? "✅" : "❌";
}

function webhookTone(status: SystemHealthSnapshot["webhookHealth"]["status"]): string {
  if (status === "ok") return "text-emerald-800";
  if (status === "attention") return "text-amber-800";
  return "text-red-800";
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
      <section
        className="rounded-xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-sm text-red-900"
        data-testid="system-health-panel"
      >
        <p className="font-medium">Não foi possível carregar a saúde do canal.</p>
        <button type="button" className={`${buttonClassName("secondary")} mt-2 text-xs`} onClick={onRefresh}>
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!snapshot || !summary) {
    return (
      <div
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]"
        data-testid="system-health-panel"
      >
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  const ch = snapshot.channelStatus;
  const wh = snapshot.webhookHealth;
  const op = snapshot.operationalControls;
  const au = snapshot.automationStatus;
  const dot = statusDot(summary.overall);
  const borderSummary =
    summary.overall === "ok"
      ? "border-emerald-200/90 bg-emerald-50/50"
      : summary.overall === "attention"
        ? "border-amber-200/90 bg-amber-50/40"
        : "border-red-200/90 bg-red-50/50";

  return (
    <section
      className="space-y-4"
      data-testid="system-health-panel"
      aria-label="Saúde do canal e automação"
    >
      <div className={`rounded-xl border px-4 py-3 sm:px-5 ${borderSummary}`}>
        <p className={`text-sm font-semibold ${dot.className}`}>
          <span aria-hidden>{dot.emoji}</span> {summary.message}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Canal WhatsApp</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-800">
            <li>
              {rowOk(ch.phoneConnected)} Número conectado{" "}
              {ch.displayPhone ? <span className="text-slate-600">({ch.displayPhone})</span> : null}
            </li>
            <li className="text-slate-700">
              Última mensagem recebida:{" "}
              <span className="font-medium text-slate-900">{formatAgo(ch.lastInboundAt)}</span>
            </li>
            <li className="text-slate-700">
              Última mensagem enviada:{" "}
              <span className="font-medium text-slate-900">{formatAgo(ch.lastOutboundAt)}</span>
            </li>
            {ch.inboxActivityRecent ? (
              <li className="text-xs text-slate-500">Inbox com actividade recente (sinal auxiliar).</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Webhook</h2>
          <p className={`mt-2 text-sm font-semibold ${webhookTone(wh.status)}`}>{wh.label}</p>
          <p className="mt-1 text-xs text-slate-600">{wh.detail}</p>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            <li>Última recepção: {formatAgo(wh.lastReceivedAt)}</li>
            <li>Último sucesso: {formatAgo(wh.lastSuccessAt)}</li>
            <li>Último erro: {formatAgo(wh.lastErrorAt)}</li>
            <li>
              Totais: {wh.totalReceived} ok / {wh.totalErrors} erros
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Estado operacional</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-800">
          <li>
            <span className="font-medium">{au.aiLabel}</span>
          </li>
          <li>
            <span className="font-medium">{au.automationLabel}</span>
          </li>
          <li className="text-xs text-slate-500">
            Controlos abaixo alteram só a camada operacional (não apagam a configuração da IA nas definições).
          </li>
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Erros (24 horas)</h2>
          <p className="mt-2 text-sm text-slate-800">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                snapshot.errorSummary.count24h > 0 ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-900"
              }`}
              data-testid="health-error-count"
            >
              {snapshot.errorSummary.count24h} erro(s)
            </span>
          </p>
          {snapshot.errorSummary.lastThree.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              <li className="font-medium text-slate-700">Últimos registos:</li>
              {snapshot.errorSummary.lastThree.map((e) => (
                <li key={e.at + e.message} className="border-l-2 border-red-200 pl-2">
                  {formatAgo(e.at)} — {e.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Nenhum erro de IA nas últimas 24 horas.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Tarefas automáticas</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-800" data-testid="health-task-counts">
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
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Eventos importantes</h2>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-700">
            {snapshot.criticalLogs.map((log) => (
              <li
                key={log.at + log.message}
                className={
                  log.tone === "error"
                    ? "border-l-2 border-red-400 pl-2"
                    : "border-l-2 border-amber-300 pl-2"
                }
              >
                <span className="text-slate-500">{new Date(log.at).toLocaleString("pt-BR")}</span> — {log.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Controles</h2>
        <p className="mt-1 text-xs text-slate-500">
          Pausas aplicam-se à automação; o inbox manual dos agentes continua disponível.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actionBusy !== null || !op.aiEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ aiEnabled: false })}
          >
            {actionBusy === "patch" ? "…" : "Pausar IA"}
          </button>
          <button
            type="button"
            disabled={actionBusy !== null || op.aiEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ aiEnabled: true })}
          >
            {actionBusy === "patch" ? "…" : "Ativar IA"}
          </button>
          <button
            type="button"
            disabled={actionBusy !== null || !op.automationEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ automationEnabled: false })}
          >
            Pausar automação
          </button>
          <button
            type="button"
            disabled={actionBusy !== null || op.automationEnabled}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void patchOperations({ automationEnabled: true })}
          >
            Ativar automação
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
          <button
            type="button"
            disabled={actionBusy !== null}
            className={buttonClassName("primary", "text-xs")}
            onClick={() => void postJson("/api/admin/run-worker", "worker", { limit: 25 })}
          >
            {actionBusy === "worker" ? "…" : "Rodar worker agora"}
          </button>
          <button
            type="button"
            disabled={actionBusy !== null}
            className={buttonClassName("secondary", "text-xs")}
            onClick={() => void postJson("/api/admin/reprocess-followups", "reprocess")}
          >
            {actionBusy === "reprocess" ? "…" : "Reprocessar pendências"}
          </button>
        </div>
        {actionMsg ? <p className="mt-2 text-xs text-slate-600">{actionMsg}</p> : null}
      </div>
    </section>
  );
}
