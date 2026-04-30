"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConversationItem } from "@/components/inbox/ConversationItem";
import type { WaInboxThreadRow } from "@/components/inbox/inboxTypes";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { Button } from "@/components/ui/button";
import {
  fetchConversationHistory,
  periodPresetToRange,
  type HistoryPeriodPreset,
  type HistoryPhaseFilter,
} from "@/lib/conversation-history/historyFetch";
import { getConversationStateBadge } from "@/components/inbox/conversationStateUi";
import type { ConversationState } from "@/modules/inbox/waInboxConversationState";

const HISTORY_QK = {
  root: (
    phase: HistoryPhaseFilter,
    from?: string,
    to?: string,
    q?: string
  ) => ["conversation-history", phase, from ?? "", to ?? "", q ?? ""] as const,
};

function formatDetailTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ConversationsHistoryClient() {
  const [phase, setPhase] = useState<HistoryPhaseFilter>("closed");
  const [periodPreset, setPeriodPreset] = useState<HistoryPeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (periodPreset === "custom") {
      const from = customFrom.trim() || undefined;
      const to = customTo.trim() || undefined;
      return { from, to };
    }
    return periodPresetToRange(periodPreset);
  }, [periodPreset, customFrom, customTo]);

  const query = useQuery({
    queryKey: HISTORY_QK.root(phase, range.from, range.to, searchApplied),
    queryFn: () =>
      fetchConversationHistory({
        phase,
        from: range.from,
        to: range.to,
        q: searchApplied || undefined,
        limit: 100,
        offset: 0,
      }),
    staleTime: 20_000,
  });

  const threads = query.data?.threads ?? [];
  const total = query.data?.pagination.total ?? 0;

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId]
  );

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const applySearch = useCallback(() => {
    setSearchApplied(searchInput.trim());
  }, [searchInput]);

  const copyPhone = useCallback(async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      /* ignore */
    }
  }, []);

  const showClosedEmpty =
    !query.isLoading &&
    !query.isError &&
    phase === "closed" &&
    !searchApplied &&
    total === 0;

  const showFilteredEmpty =
    !query.isLoading && !query.isError && total === 0 && !showClosedEmpty;

  return (
    <div
      className="df-page flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6"
      data-testid="conversations-history-page"
    >
      <PageHeader
        eyebrow="Consulta e auditoria"
        eyebrowTone="neutral"
        title="Histórico de conversas"
        description="Consulte conversas encerradas, atendimentos anteriores e registros para auditoria operacional."
        tone="admin"
        sensitivityBadge={false}
        layout="split"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="df-badge-info rounded-full px-2.5 py-1 text-xs font-medium">
              Consulta e auditoria
            </span>
            <Button variant="secondary" asChild>
              <Link href="/inbox">Voltar para Inbox</Link>
            </Button>
          </div>
        }
      />

      <Section tone="dark" className="rounded-2xl border df-border-brand p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--df-text-secondary)]">
            Status
            <select
              className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
              value={phase}
              onChange={(e) => setPhase(e.target.value as HistoryPhaseFilter)}
              data-testid="history-filter-phase"
            >
              <option value="closed">Encerradas</option>
              <option value="all">Todas</option>
              <option value="awaiting_customer">Aguardando cliente</option>
              <option value="in_attendance">Em atendimento</option>
            </select>
          </label>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--df-text-secondary)]">Período</span>
            <div className="flex flex-wrap gap-2" data-testid="history-filter-period">
              {(
                [
                  ["today", "Hoje"],
                  ["7d", "Últimos 7 dias"],
                  ["30d", "Últimos 30 dias"],
                  ["all", "Todo o período"],
                  ["custom", "Personalizado"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={periodPreset === key ? "default" : "secondary"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPeriodPreset(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {periodPreset === "custom" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="date"
                  className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-2 py-1.5 text-sm"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="Data inicial"
                />
                <input
                  type="date"
                  className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-2 py-1.5 text-sm"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="Data final"
                />
              </div>
            ) : null}
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--df-text-secondary)]">Busca</span>
            <div className="flex gap-2">
              <input
                type="search"
                placeholder="Nome, telefone ou mensagem…"
                className="min-w-0 flex-1 rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)] placeholder:text-[var(--df-text-muted)]"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                data-testid="history-search-input"
              />
              <Button type="button" variant="secondary" onClick={applySearch}>
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Section
          tone="dark"
          className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-2xl border df-border-brand"
        >
          {query.isLoading ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <StateLoading message="A carregar histórico…" />
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <StateError
                message={query.error instanceof Error ? query.error.message : "Erro ao carregar"}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : showClosedEmpty ? (
            <div className="df-feedback-info m-4 rounded-xl p-4 text-sm leading-relaxed" data-testid="history-empty-closed">
              <p className="font-semibold text-[var(--df-text-primary)]">Nenhuma conversa encerrada ainda</p>
              <p className="mt-2 text-[var(--df-text-secondary)]">
                Quando atendimentos forem finalizados, eles aparecerão aqui para consulta.
              </p>
            </div>
          ) : showFilteredEmpty ? (
            <div className="df-feedback-info m-4 rounded-xl p-4 text-sm" data-testid="history-empty-filtered">
              <p className="font-semibold text-[var(--df-text-primary)]">Nenhum resultado</p>
              <p className="mt-1 text-[var(--df-text-secondary)]">
                Ajuste filtros ou o termo de busca e tente novamente.
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto" data-testid="history-thread-list">
              {threads.map((t) => (
                <li key={t.id} className="px-1 py-0.5">
                  <ConversationItem thread={t} active={t.id === selectedId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          tone="dark"
          className="flex min-h-[320px] min-w-0 flex-col rounded-2xl border df-border-brand p-4 sm:p-5"
          data-testid="history-preview-panel"
        >
          {!selected ? (
            <div className="df-feedback-info flex flex-1 flex-col items-center justify-center rounded-xl p-6 text-center text-sm text-[var(--df-text-secondary)]">
              Selecione uma conversa na lista para ver o resumo e abrir na Inbox.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="df-feedback-info rounded-xl px-3 py-2 text-xs leading-snug text-[var(--df-text-secondary)]">
                Visualização somente leitura. Para responder, abra na Inbox.
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--df-text-primary)]">
                  {selected.contactName?.trim() || selected.phoneNumber}
                </h2>
                <p className="mt-1 text-sm text-[var(--df-text-secondary)]">{selected.phoneNumber}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(() => {
                    const st = selected.conversationState as ConversationState | undefined;
                    const b = getConversationStateBadge(st);
                    return b ? (
                      <span className={b.className} data-testid="history-preview-status-badge">
                        {b.label}
                      </span>
                    ) : (
                      <span className="df-badge-info rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {selected.status}
                      </span>
                    );
                  })()}
                  {selected.assignedToUser?.name ? (
                    <span className="text-xs text-[var(--df-text-muted)]">
                      Responsável: {selected.assignedToUser.name}
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-[var(--df-text-muted)]">Última atividade</dt>
                  <dd className="text-[var(--df-text-primary)]">{formatDetailTime(selected.lastMessageAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--df-text-muted)]">Pré-visualização</dt>
                  <dd className="text-[var(--df-text-primary)]">{selected.lastMessagePreview ?? "—"}</dd>
                </div>
                {selected.queue?.name ? (
                  <div>
                    <dt className="text-[var(--df-text-muted)]">Fila</dt>
                    <dd className="text-[var(--df-text-primary)]">{selected.queue.name}</dd>
                  </div>
                ) : null}
              </dl>
              {selected.threadTags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {selected.threadTags.map((tt) => (
                    <span
                      key={tt.tag.id}
                      className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium df-text-secondary"
                    >
                      {tt.tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2 border-t df-border-brand pt-4">
                <Button variant="default" asChild>
                  <Link href={`/inbox?thread=${encodeURIComponent(selected.id)}`}>Abrir na Inbox</Link>
                </Button>
                <Button type="button" variant="secondary" onClick={() => void copyPhone(selected.phoneNumber)}>
                  Copiar telefone
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
