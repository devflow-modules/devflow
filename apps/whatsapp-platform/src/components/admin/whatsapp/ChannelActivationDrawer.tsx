"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChannelActivationEvent } from "@/modules/whatsapp/channelEventService";
import type { AdminChannelDetail } from "@/modules/whatsapp/channelActivationService";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { useSimpleToast } from "@/components/ui/simple-toast";
import { ChannelVerificationCard } from "@/components/admin/whatsapp/ChannelVerificationCard";

type Props = {
  channelId: string | null;
  open: boolean;
  onClose: () => void;
  /** Abre o fluxo de ativação (token) — usado pelo CTA «Tentar de novo». */
  onRetryActivate?: (channelId: string) => void;
};

function eventIcon(type: string): string {
  switch (type) {
    case "ACTIVATED":
      return "✓";
    case "CHANNEL_CREATED":
      return "＋";
    case "TOKEN_ATTACHED":
      return "🔑";
    case "WEBHOOK_VERIFIED":
      return "🔗";
    case "ERROR":
      return "✕";
    case "AUTO_HEAL_ATTEMPT":
      return "⚙";
    case "AUTO_HEAL_SUCCESS":
      return "✓";
    case "AUTO_HEAL_FAILED":
      return "✕";
    case "AUTO_HEAL_SKIPPED":
      return "⏭";
    case "VERIFICATION_CHECKLIST_UPDATED":
      return "☑";
    case "VERIFICATION_STATUS_CHANGED":
      return "◎";
    case "VERIFICATION_COMPUTED":
      return "📊";
    default:
      return "•";
  }
}

function eventTitle(type: string): string {
  switch (type) {
    case "ACTIVATED":
      return "Canal ativado";
    case "CHANNEL_CREATED":
      return "Canal criado";
    case "TOKEN_ATTACHED":
      return "Token associado";
    case "WEBHOOK_VERIFIED":
      return "Webhook verificado";
    case "ERROR":
      return "Erro";
    case "AUTO_HEAL_ATTEMPT":
      return "Auto-healing (tentativa)";
    case "AUTO_HEAL_SUCCESS":
      return "Auto-healing (sucesso)";
    case "AUTO_HEAL_FAILED":
      return "Auto-healing (falhou)";
    case "AUTO_HEAL_SKIPPED":
      return "Auto-healing (ignorado)";
    case "VERIFICATION_CHECKLIST_UPDATED":
      return "Verificação Meta — checklist";
    case "VERIFICATION_STATUS_CHANGED":
      return "Verificação Meta — estado";
    case "VERIFICATION_COMPUTED":
      return "Verificação Meta — prontidão";
    default:
      return type;
  }
}

export function ChannelActivationDrawer({ channelId, open, onClose, onRetryActivate }: Props) {
  const [detail, setDetail] = useState<AdminChannelDetail | null>(null);
  const [events, setEvents] = useState<ChannelActivationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast, toastAnchor } = useSimpleToast(3200);

  const reloadTimelineOnly = useCallback(async () => {
    if (!channelId) return;
    const tRes = await fetchProtected(`/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}/timeline`);
    const tJson = await tRes.json().catch(() => ({}));
    if (tRes.ok && (tJson as { success?: boolean }).success) {
      const ev = (tJson as { data?: { events?: ChannelActivationEvent[] } }).data?.events;
      setEvents(Array.isArray(ev) ? ev : []);
    }
  }, [channelId]);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      const [dRes, tRes] = await Promise.all([
        fetchProtected(`/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}`),
        fetchProtected(`/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}/timeline`),
      ]);
      const dJson = await dRes.json().catch(() => ({}));
      const tJson = await tRes.json().catch(() => ({}));
      if (!dRes.ok || !(dJson as { success?: boolean }).success) {
        setDetail(null);
        setError(protectedApiUserMessage(dRes.status, dJson as { error?: { message?: string } }));
        return;
      }
      setDetail((dJson as { data?: AdminChannelDetail }).data ?? null);
      if (tRes.ok && (tJson as { success?: boolean }).success) {
        const ev = (tJson as { data?: { events?: ChannelActivationEvent[] } }).data?.events;
        setEvents(Array.isArray(ev) ? ev : []);
      } else {
        setEvents([]);
      }
    } catch {
      setError("Erro ao carregar timeline.");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (!open || !channelId) {
      setDetail(null);
      setEvents([]);
      setError(null);
      return;
    }
    void load();
  }, [open, channelId, load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex justify-end">
      {toastAnchor}
      <Button variant="ghost"
        type="button"
        className="absolute inset-0 bg-muted/40"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside
        className="relative z-[401] flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-drawer-title"
        data-testid="channel-activation-drawer"
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="channel-drawer-title" className="df-text-section-title df-text-primary">
              Diagnóstico do canal
            </h2>
            {detail ? (
              <p className="mt-1 font-mono text-xs df-text-muted truncate">{detail.phoneNumberId}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="space-y-3" aria-busy>
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : (
            <>
              {detail ? (
                <>
                  <dl className="mb-6 space-y-2 rounded-lg border border-border bg-muted/60/80 p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="df-text-muted">Estado</dt>
                      <dd className="font-mono text-xs">{detail.status}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="df-text-muted">Telefone</dt>
                      <dd className="font-mono">{detail.phoneNumber}</dd>
                    </div>
                    {detail.status === "PENDING_ACTIVATION" ? (
                      <>
                        <div className="flex justify-between gap-2">
                          <dt className="df-text-muted">Na fila</dt>
                          <dd>{detail.minutesInQueue} min</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="df-text-muted">SLA</dt>
                          <dd className="font-mono">{detail.slaStatus}</dd>
                        </div>
                      </>
                    ) : null}
                    {detail.lastEvent ? (
                      <div className="border-t border-border pt-2">
                        <dt className="df-text-muted">Último evento</dt>
                        <dd className="mt-1 df-text-primary">
                          <span className="font-mono text-xs">{detail.lastEvent.type}</span> —{" "}
                          {detail.lastEvent.message}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {detail.autoHealFeatureEnabled === false ? (
                    <p className="mb-2 text-xs df-text-secondary" data-testid="auto-heal-feature-off">
                      Correção automática desligada neste ambiente (defina WHATSAPP_AUTO_HEAL_ENABLED).
                    </p>
                  ) : null}
                  {detail.autoHealFeatureEnabled && detail.autoHealAttempts >= 2 ? (
                    <p className="mb-2 text-xs font-medium df-text-secondary" data-testid="auto-heal-limit-hint">
                      Limite de tentativas automáticas atingido (2/2). Ação manual necessária.
                    </p>
                  ) : null}
                  {detail.autoHealFeatureEnabled && detail.autoHealStatus === "COOLDOWN" ? (
                    <p className="mb-2 text-xs df-text-warning" data-testid="auto-heal-cooldown-hint">
                      Em espera (cooldown): a próxima tentativa automática só após o intervalo definido.
                    </p>
                  ) : null}
                  {detail.autoHealFeatureEnabled &&
                  detail.autoHealStatus === "ACTIVE" &&
                  detail.autoHealCandidate ? (
                    <p className="mb-2 text-xs font-medium df-text-success" data-testid="auto-heal-active-hint">
                      Correção automática ativa — pode executar em segundo plano após carregar a fila.
                    </p>
                  ) : null}
                  {detail.autoHealFeatureEnabled &&
                  detail.autoHealStatus === "DISABLED" &&
                  detail.autoHealAttempts < 2 ? (
                    <p className="mb-2 text-xs df-text-secondary" data-testid="auto-heal-disabled-hint">
                      Sem correção automática para este estado (erro não elegível, canal ativo ou sem token
                      guardado).
                    </p>
                  ) : null}
                  <p className="mb-4 text-[11px] df-text-muted">
                    Tentativas automáticas registadas: {detail.autoHealAttempts} / 2
                  </p>
                  {channelId ? (
                    <ChannelVerificationCard channelId={channelId} onTimelineRefresh={() => void reloadTimelineOnly()} />
                  ) : null}
                </>
              ) : null}

              {detail?.playbook ? (
                <section className="df-panel-playbook mb-6 p-4" data-testid="channel-playbook-section">
                  <h3 className="df-label mb-2 df-text-info">Sugestão de resolução</h3>
                  <p className="mb-3 font-medium df-text-primary">{detail.playbook.title}</p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm df-text-secondary">
                    {detail.playbook.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  {detail.playbook.cta ? (
                    <div className="mt-4">
                      {detail.playbook.cta.action === "RETRY" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          data-testid="playbook-cta-retry"
                          onClick={() => {
                            if (channelId && onRetryActivate) {
                              onRetryActivate(channelId);
                              onClose();
                            }
                          }}
                          disabled={!onRetryActivate || !channelId}
                        >
                          {detail.playbook.cta.label}
                        </Button>
                      ) : null}
                      {detail.playbook.cta.action === "COPY_WEBHOOK" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid="playbook-cta-copy-webhook"
                          onClick={async () => {
                            const text = detail.playbook?.cta?.copyPayload ?? "";
                            if (!text) {
                              showToast("URL indisponível.");
                              return;
                            }
                            try {
                              await navigator.clipboard.writeText(text);
                              showToast("URL do webhook copiada.");
                            } catch {
                              showToast("Não foi possível copiar.");
                            }
                          }}
                        >
                          {detail.playbook.cta.label}
                        </Button>
                      ) : null}
                      {detail.playbook.cta.action === "OPEN_META" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid="playbook-cta-open-meta"
                          onClick={() => {
                            const href = detail.playbook?.cta?.href;
                            if (href) window.open(href, "_blank", "noopener,noreferrer");
                          }}
                        >
                          {detail.playbook.cta.label}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <h3 className="df-label mb-3 df-text-secondary">Timeline</h3>
              {events.length === 0 ? (
                <p className="text-sm df-text-secondary">Sem eventos registados ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-border bg-card p-3 shadow-sm"
                      data-testid={`timeline-event-${ev.id}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg" aria-hidden>
                          {eventIcon(ev.type)}
                        </span>
                        <span className="font-medium df-text-primary">{eventTitle(ev.type)}</span>
                        <time className="text-xs df-text-muted">
                          {new Date(ev.createdAt).toLocaleString("pt-PT")}
                        </time>
                      </div>
                      <p className="mt-1 text-sm df-text-secondary">{ev.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
