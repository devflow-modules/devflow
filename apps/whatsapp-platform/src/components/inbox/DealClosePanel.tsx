"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postClearDealSuggestion,
  postCloseInboxDeal,
  postSuggestInboxDeal,
} from "./inboxFetch";
import { INBOX_QK, type WaInboxThreadRow } from "./inboxTypes";
import { Button } from "@/components/ui/button";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { isOperator, isTenantManager } from "@/lib/roles";
import { INBOX_CHAT_GUTTER_X } from "./inboxChatLayout";
import {
  DEAL_LOST_REASON_LABELS,
  DEAL_LOST_REASONS,
  type DealLostReason,
} from "@/modules/inbox/dealTypes";

const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function lostLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return DEAL_LOST_REASON_LABELS[code as DealLostReason] ?? code;
}

export function DealClosePanel({
  threadId,
  thread,
}: {
  threadId: string | null;
  thread: WaInboxThreadRow | null;
}) {
  const qc = useQueryClient();
  const { role } = useSessionRole();
  const canManage = role != null && isTenantManager(role);
  const isOp = role != null && isOperator(role);
  const canSuggest = isOp || canManage;

  const [value, setValue] = useState("");
  const [suggestValue, setSuggestValue] = useState("");
  const [lostReason, setLostReason] = useState<DealLostReason | "">("");
  const [suggestLostReason, setSuggestLostReason] = useState<DealLostReason | "">("");
  const [suggestMode, setSuggestMode] = useState<null | "won" | "lost">(null);
  const [error, setError] = useState<string | null>(null);

  const dealStatus = thread?.dealStatus ?? null;
  const hasPendingSuggestion = Boolean(thread?.dealSuggested && thread?.dealSuggestedStatus);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: INBOX_QK.thread(threadId!) });
    await qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
  };

  const closeMut = useMutation({
    mutationFn: (p: { status: "won" | "lost"; value?: number; lostReason?: string }) =>
      postCloseInboxDeal(threadId!, {
        status: p.status,
        value: p.value,
        currency: thread?.dealCurrency ?? "BRL",
        lostReason: p.lostReason,
      }),
    onSuccess: async () => {
      setError(null);
      setValue("");
      setLostReason("");
      await invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const suggestMut = useMutation({
    mutationFn: (p: { status: "won" | "lost"; value?: number; lostReason?: string }) =>
      postSuggestInboxDeal(threadId!, p),
    onSuccess: async () => {
      setError(null);
      setSuggestMode(null);
      setSuggestValue("");
      setSuggestLostReason("");
      await invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const clearMut = useMutation({
    mutationFn: () => postClearDealSuggestion(threadId!),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  useEffect(() => {
    if (hasPendingSuggestion && thread?.dealSuggestedStatus === "won" && thread.dealSuggestedValue != null) {
      setValue(String(thread.dealSuggestedValue));
    }
  }, [hasPendingSuggestion, thread?.dealSuggestedStatus, thread?.dealSuggestedValue]);

  if (!threadId || !thread) return null;

  if (dealStatus === "won") {
    const v = thread.dealValue;
    const cur = (thread.dealCurrency ?? "BRL").toUpperCase();
    const formatted =
      v != null && cur === "BRL"
        ? moneyFmt.format(v)
        : v != null
          ? `${v} ${cur}`
          : "Valor não registado";
    return (
      <div
        id="inbox-deal-close"
        className={`shrink-0 border-t border-emerald-200/80 bg-emerald-50/50 ${INBOX_CHAT_GUTTER_X} py-3`}
        role="status"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Venda fechada</p>
        <p className="mt-1 text-sm font-medium text-emerald-950">{formatted}</p>
      </div>
    );
  }

  if (dealStatus === "lost") {
    return (
      <div
        id="inbox-deal-close"
        className={`shrink-0 border-t df-border-brand bg-muted/50 ${INBOX_CHAT_GUTTER_X} py-3`}
        role="status"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Oportunidade</p>
        <p className="mt-1 text-sm font-medium text-[var(--df-text-secondary)]">Marcada como perdida</p>
        {thread.dealLostReason ? (
          <p className="mt-1 text-xs text-[var(--df-text-muted)]">
            Motivo: <span className="font-medium text-[var(--df-text-secondary)]">{lostLabel(thread.dealLostReason)}</span>
          </p>
        ) : null}
      </div>
    );
  }

  const pendingBadge = (
    <div className="mb-2 flex flex-wrap gap-2">
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-300/80">
        Sugestão pendente
      </span>
      {canManage ? (
        <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-950 ring-1 ring-sky-300/80">
          Aguardando confirmação
        </span>
      ) : null}
    </div>
  );

  /** Operador: apenas sugerir (manager vê fluxo próprio abaixo). */
  if (!canManage && canSuggest) {
    return (
      <div
        id="inbox-deal-close"
        className={`shrink-0 border-t df-border-brand bg-[var(--df-bg-elevated)]/90 ${INBOX_CHAT_GUTTER_X} py-3`}
      >
        {hasPendingSuggestion ? pendingBadge : null}
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--df-text-muted)]">Fechar venda</p>
        <p className="mt-0.5 text-xs text-[var(--df-text-secondary)]">
          Sugira o resultado — só um gestor confirma o fecho.
        </p>
        {suggestMode === null ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              className="min-h-12 w-full text-sm font-semibold sm:flex-1"
              disabled={suggestMut.isPending || hasPendingSuggestion}
              onClick={() => {
                setError(null);
                setSuggestMode("won");
              }}
            >
              Sugerir ganho
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full border border-border/90 bg-muted/50 text-sm font-semibold text-[var(--df-text-secondary)] hover:bg-muted sm:flex-1"
              disabled={suggestMut.isPending || hasPendingSuggestion}
              onClick={() => {
                setError(null);
                setSuggestMode("lost");
              }}
            >
              Sugerir perda
            </Button>
          </div>
        ) : suggestMode === "won" ? (
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-[var(--df-text-secondary)]" htmlFor="suggest-deal-value">
              Valor sugerido (BRL)
            </label>
            <input
              id="suggest-deal-value"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={suggestValue}
              onChange={(e) => setSuggestValue(e.target.value)}
              placeholder="ex.: 1500"
              disabled={suggestMut.isPending}
              className="w-full rounded-lg border df-border-dark bg-card px-3 py-3 text-base text-[var(--df-text-primary)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/30 disabled:opacity-60"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                className="min-h-12 flex-1 text-sm font-semibold"
                disabled={suggestMut.isPending}
                onClick={() => {
                  const normalized = suggestValue.replace(",", ".").trim();
                  const v = Number.parseFloat(normalized);
                  if (!Number.isFinite(v) || v <= 0) {
                    setError("Indique um valor válido maior que zero.");
                    return;
                  }
                  setError(null);
                  suggestMut.mutate({ status: "won", value: v });
                }}
              >
                Enviar sugestão
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 flex-1 text-sm font-semibold"
                disabled={suggestMut.isPending}
                onClick={() => {
                  setSuggestMode(null);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label htmlFor="suggest-lost-reason" className="text-xs font-medium text-[var(--df-text-secondary)]">
              Motivo da perda
            </label>
            <select
              id="suggest-lost-reason"
              value={suggestLostReason}
              onChange={(e) => setSuggestLostReason(e.target.value as DealLostReason | "")}
              disabled={suggestMut.isPending}
              className="w-full rounded-lg border df-border-dark bg-card px-3 py-3 text-base text-[var(--df-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/30 disabled:opacity-60"
            >
              <option value="">Selecione…</option>
              {DEAL_LOST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {DEAL_LOST_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                className="min-h-12 flex-1 text-sm font-semibold"
                disabled={suggestMut.isPending}
                onClick={() => {
                  if (!suggestLostReason) {
                    setError("Selecione o motivo da perda.");
                    return;
                  }
                  setError(null);
                  suggestMut.mutate({ status: "lost", lostReason: suggestLostReason });
                }}
              >
                Enviar sugestão
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 flex-1 text-sm font-semibold"
                disabled={suggestMut.isPending}
                onClick={() => {
                  setSuggestMode(null);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {error ? (
          <p className="mt-2 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!canManage) return null;

  if (hasPendingSuggestion) {
    const st = thread.dealSuggestedStatus;
    const isWon = st === "won";
    return (
      <div
        id="inbox-deal-close"
        className={`shrink-0 border-t border-amber-200/90 bg-amber-50/40 ${INBOX_CHAT_GUTTER_X} py-3`}
      >
        {pendingBadge}
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-950/90">Operador sugeriu</p>
        <div className="mt-2 rounded-lg border border-amber-200/80 bg-card/80 px-3 py-2.5 text-sm text-[var(--df-text-primary)]">
          {isWon ? (
            <>
              <span className="font-semibold text-emerald-800">Ganho</span>
              {thread.dealSuggestedValue != null ? (
                <span className="mt-1 block text-[var(--df-text-secondary)]">
                  Valor: {moneyFmt.format(thread.dealSuggestedValue)}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--df-text-secondary)]">Perda</span>
              <span className="mt-1 block text-[var(--df-text-secondary)]">
                Motivo: {lostLabel(thread.dealSuggestedLostReason)}
              </span>
            </>
          )}
        </div>
        {isWon ? (
          <div className="mt-3">
            <label htmlFor="deal-value-confirm" className="text-xs font-medium text-[var(--df-text-secondary)]">
              Confirmar valor (BRL)
            </label>
            <input
              id="deal-value-confirm"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex.: 1500"
              disabled={closeMut.isPending}
              className="mt-1 w-full rounded-lg border df-border-dark bg-card px-3 py-2.5 text-sm text-[var(--df-text-primary)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/30 disabled:opacity-60"
            />
          </div>
        ) : null}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            type="button"
            className="min-h-12 min-w-[9rem] flex-1 px-4 text-sm font-semibold sm:flex-none"
            disabled={closeMut.isPending || clearMut.isPending}
            onClick={() => {
              if (isWon) {
                const normalized = value.replace(",", ".").trim();
                const v = Number.parseFloat(normalized);
                if (!Number.isFinite(v) || v <= 0) {
                  setError("Indique um valor válido maior que zero.");
                  return;
                }
                setError(null);
                closeMut.mutate({ status: "won", value: v });
              } else {
                const lr = thread.dealSuggestedLostReason;
                if (!lr) {
                  setError("Motivo da sugestão em falta.");
                  return;
                }
                setError(null);
                closeMut.mutate({ status: "lost", lostReason: lr });
              }
            }}
          >
            Confirmar
          </Button>
          <Button
            variant="secondary"
            type="button"
            className="min-h-12 min-w-[9rem] flex-1 border border-border/90 bg-muted/50 px-4 text-sm font-semibold text-[var(--df-text-secondary)] hover:bg-muted sm:flex-none"
            disabled={closeMut.isPending || clearMut.isPending}
            onClick={() => {
              setError(null);
              clearMut.mutate();
            }}
          >
            Ignorar
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const submitWon = () => {
    const normalized = value.replace(",", ".").trim();
    const v = Number.parseFloat(normalized);
    if (!Number.isFinite(v) || v <= 0) {
      setError("Indique um valor válido maior que zero.");
      return;
    }
    setError(null);
    closeMut.mutate({ status: "won", value: v });
  };

  const submitLost = () => {
    if (!lostReason) {
      setError("Selecione o motivo da perda.");
      return;
    }
    setError(null);
    closeMut.mutate({ status: "lost", lostReason });
  };

  return (
    <div
      id="inbox-deal-close"
      className={`shrink-0 border-t df-border-brand bg-[var(--df-bg-elevated)]/90 ${INBOX_CHAT_GUTTER_X} py-3`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--df-text-muted)]">Fechar venda</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="deal-value-input" className="text-xs font-medium text-[var(--df-text-secondary)]">
            Valor (BRL)
          </label>
          <input
            id="deal-value-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex.: 1500"
            disabled={closeMut.isPending}
            className="mt-1 w-full rounded-lg border df-border-dark bg-card px-3 py-2.5 text-sm text-[var(--df-text-primary)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/30 disabled:opacity-60"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button
            variant="primary"
            type="button"
            className="min-h-11 min-w-[8.5rem] flex-1 px-4 text-sm font-semibold sm:flex-none"
            disabled={closeMut.isPending}
            onClick={submitWon}
          >
            Fechou venda
          </Button>
        </div>
      </div>
      <div className="mt-4 border-t border-border/60 pt-3">
        <label htmlFor="deal-lost-reason" className="text-xs font-medium text-[var(--df-text-secondary)]">
          Perda — motivo
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <select
            id="deal-lost-reason"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value as DealLostReason | "")}
            disabled={closeMut.isPending}
            className="w-full min-h-11 flex-1 rounded-lg border df-border-dark bg-card px-3 py-2.5 text-sm text-[var(--df-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/30 disabled:opacity-60 sm:max-w-xs"
          >
            <option value="">Selecione para registar perda…</option>
            {DEAL_LOST_REASONS.map((r) => (
              <option key={r} value={r}>
                {DEAL_LOST_REASON_LABELS[r]}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            type="button"
            className="min-h-11 min-w-[8.5rem] flex-1 border border-border/90 bg-muted/50 px-4 text-sm font-semibold text-[var(--df-text-secondary)] hover:bg-muted sm:flex-none"
            disabled={closeMut.isPending}
            onClick={submitLost}
          >
            Perdeu venda
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
