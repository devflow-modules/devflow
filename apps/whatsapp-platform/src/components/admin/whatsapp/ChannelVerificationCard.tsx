"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@devflow/ui";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { useSimpleToast } from "@/components/ui/simple-toast";

type VerificationItem = { id: string; label: string; done: boolean };

type VerificationDto = {
  channelId: string;
  status: string;
  checklist: { items: VerificationItem[] };
  readinessScore: number;
  suggestedStatus: string | null;
  verificationChecklistUpdatedAt: string | null;
  verificationReadyAt: string | null;
  verificationSubmittedAt: string | null;
  verificationApprovedAt: string | null;
  verificationRejectedAt: string | null;
};

function statusLabel(status: string): string {
  switch (status) {
    case "NOT_STARTED":
      return "Não iniciada";
    case "READY_FOR_SUBMISSION":
      return "Pronta para submissão";
    case "IN_REVIEW":
      return "Em revisão";
    case "APPROVED":
      return "Aprovada";
    case "REJECTED":
      return "Rejeitada";
    default:
      return status;
  }
}

type Props = {
  channelId: string;
  onTimelineRefresh: () => void;
};

export function ChannelVerificationCard({ channelId, onTimelineRefresh }: Props) {
  const [data, setData] = useState<VerificationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { showToast, toastAnchor } = useSimpleToast(3800);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProtected(
        `/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}/verification`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !(json as { success?: boolean }).success) {
        setData(null);
        showToast(protectedApiUserMessage(res.status, json as { error?: { message?: string } }));
        return;
      }
      setData((json as { data?: VerificationDto }).data ?? null);
    } finally {
      setLoading(false);
    }
  }, [channelId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const postChecklist = async (updates: Record<string, boolean>) => {
    setBusy(true);
    try {
      const res = await fetchProtected(
        `/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}/verification/checklist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !(json as { success?: boolean }).success) {
        showToast(protectedApiUserMessage(res.status, json as { error?: { message?: string } }));
        return;
      }
      setData((json as { data?: VerificationDto }).data ?? null);
      onTimelineRefresh();
      showToast("Checklist atualizada.");
    } finally {
      setBusy(false);
    }
  };

  const postStatus = async (action: "mark_ready" | "start" | "approve" | "reject") => {
    let note: string | undefined;
    if (action === "reject") {
      const entered = window.prompt("Motivo da rejeição (opcional, visível na timeline):");
      if (entered === null) return;
      note = entered.trim() || undefined;
    }
    setBusy(true);
    try {
      const res = await fetchProtected(
        `/api/admin/whatsapp/channels/${encodeURIComponent(channelId)}/verification/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !(json as { success?: boolean }).success) {
        const msg = protectedApiUserMessage(res.status, json as { error?: { message?: string } });
        const detail = (json as { error?: { message?: string } })?.error?.message;
        showToast(detail || msg);
        return;
      }
      setData((json as { data?: VerificationDto }).data ?? null);
      onTimelineRefresh();
      showToast("Estado de verificação atualizado.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="mb-6 rounded-xl border df-border-brand bg-[var(--df-bg-elevated)]/80 p-4" aria-busy>
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-24 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { checklist, readinessScore, status, suggestedStatus } = data;
  const canMarkReady =
    (status === "NOT_STARTED" || status === "REJECTED") && readinessScore === 100 && !busy;
  const canStart = status === "READY_FOR_SUBMISSION" && !busy;
  const canApproveReject = status === "IN_REVIEW" && !busy;

  return (
    <section
      className="mb-6 rounded-xl border df-border-brand bg-[var(--df-admin-50)] p-4"
      data-testid="channel-verification-card"
    >
      {toastAnchor}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="df-label text-[var(--df-admin-900)]">Verificação Meta Business</h3>
          <p className="mt-0.5 text-xs text-[var(--df-text-secondary)]">
            Estado operacional interno — não substitui o fluxo oficial no Meta Suite.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--df-bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--df-text-primary)] ring-1 ring-[var(--df-border-subtle)]">
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-[var(--df-text-secondary)]">
          <span>Prontidão</span>
          <span className="tabular-nums">{readinessScore}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--df-bg-app)]">
          <div
            className="h-full rounded-full bg-[var(--df-brand-500)] transition-[width]"
            style={{ width: `${readinessScore}%` }}
          />
        </div>
        {suggestedStatus ? (
          <p className="mt-1.5 text-[11px] font-medium text-[var(--df-success-text)]">
            Sugestão: checklist completa — pode marcar «Pronto para submissão».
          </p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 rounded-lg border df-border-brand bg-[var(--df-bg-elevated)]/90 px-2 py-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--df-brand-600)]"
              checked={item.done}
              disabled={busy}
              onChange={(e) => void postChecklist({ [item.id]: e.target.checked })}
              aria-label={item.label}
            />
            <span className="text-sm leading-snug text-[var(--df-text-primary)]">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 border-t df-border-brand pt-3">
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={!canMarkReady}
          onClick={() => void postStatus("mark_ready")}
        >
          Marcar pronto
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={!canStart} onClick={() => void postStatus("start")}>
          Iniciar revisão
        </Button>
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={!canApproveReject}
          onClick={() => void postStatus("approve")}
        >
          Aprovar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!canApproveReject}
          onClick={() => void postStatus("reject")}
        >
          Rejeitar
        </Button>
      </div>

      <dl className="mt-3 space-y-1 text-[11px] text-[var(--df-text-secondary)]">
        {data.verificationChecklistUpdatedAt ? (
          <div className="flex justify-between gap-2">
            <dt>Checklist</dt>
            <dd>{new Date(data.verificationChecklistUpdatedAt).toLocaleString("pt-PT")}</dd>
          </div>
        ) : null}
        {data.verificationReadyAt ? (
          <div className="flex justify-between gap-2">
            <dt>Pronto</dt>
            <dd>{new Date(data.verificationReadyAt).toLocaleString("pt-PT")}</dd>
          </div>
        ) : null}
        {data.verificationSubmittedAt ? (
          <div className="flex justify-between gap-2">
            <dt>Revisão iniciada</dt>
            <dd>{new Date(data.verificationSubmittedAt).toLocaleString("pt-PT")}</dd>
          </div>
        ) : null}
        {data.verificationApprovedAt ? (
          <div className="flex justify-between gap-2">
            <dt>Aprovada</dt>
            <dd>{new Date(data.verificationApprovedAt).toLocaleString("pt-PT")}</dd>
          </div>
        ) : null}
        {data.verificationRejectedAt ? (
          <div className="flex justify-between gap-2">
            <dt>Rejeitada</dt>
            <dd>{new Date(data.verificationRejectedAt).toLocaleString("pt-PT")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
