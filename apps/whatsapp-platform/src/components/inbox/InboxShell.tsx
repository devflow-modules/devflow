"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ConversationsList } from "./ConversationsList";
import { ChatWindow } from "./ChatWindow";
import {
  fetchInboxConversations,
  fetchInboxOperationalQueues,
  fetchTenantWhatsappLines,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter } from "./inboxTypes";
import { useMediaMd } from "./useMediaMd";
import { useInboxRealtime, InboxRealtimeProvider } from "./useInboxRealtime";
import { OnlineUsersBadge } from "./OnlineUsersBadge";
import { InboxMetricsPanel } from "./InboxMetricsPanel";
import { PageHeader } from "@/components/ui/page-header";
import { FirstConversationHint } from "./FirstConversationHint";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { CONTEXTUAL_UPGRADE_HINTS } from "@/modules/billing/planPresentation";
import { fetchProtected } from "@/lib/protected-fetch";
import { getUiPlanCapabilities } from "@/modules/billing/planUiCapabilities";
import { FEATURE_UPGRADE_COPY } from "@/modules/billing/featureUpgradeCopy";
import { contextualInboxUsageHint } from "@/modules/billing/usageCommunication";

/** Polling: 10s quando realtime conectado, 5s como fallback. */
const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

export function InboxShell() {
  return (
    <InboxRealtimeProvider>
      <InboxShellContent />
    </InboxRealtimeProvider>
  );
}

const INBOX_PHASES: InboxConversationsFilter[] = [
  "all",
  "needs_response",
  "mine",
  "unassigned",
  "in_attendance",
  "awaiting_customer",
  "closed",
];

function InboxShellContent() {
  const searchParams = useSearchParams();
  const isMd = useMediaMd();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [filter, setFilter] = useState<InboxConversationsFilter>("needs_response");
  const [lineFilter, setLineFilter] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const { connected: realtimeConnected } = useInboxRealtime();

  useEffect(() => {
    const legacy = searchParams.get("filter");
    const phaseParam = searchParams.get("phase");
    const priorityParam = searchParams.get("priority");

    let nextPhase: InboxConversationsFilter = "needs_response";
    let nextPriority: string | null = null;

    if (legacy === "high_no_response") {
      nextPhase = "needs_response";
      nextPriority = "HIGH";
    } else if (legacy === "stalled") {
      nextPhase = "awaiting_customer";
    } else if (legacy === "reactivation") {
      nextPhase = "needs_response";
      nextPriority = "HIGH";
    }

    if (phaseParam && INBOX_PHASES.includes(phaseParam as InboxConversationsFilter)) {
      nextPhase = phaseParam as InboxConversationsFilter;
    }
    const pu = priorityParam?.trim().toUpperCase();
    if (pu === "LOW" || pu === "MEDIUM" || pu === "HIGH") {
      nextPriority = pu;
    }

    setFilter(nextPhase);
    setPriorityFilter(nextPriority);
  }, [searchParams]);

  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data: lines = [] } = useQuery({
    queryKey: INBOX_QK.phoneLines,
    queryFn: fetchTenantWhatsappLines,
    staleTime: 60_000,
  });

  const { data: billingUi } = useQuery({
    queryKey: ["tenant-billing-ui"],
    queryFn: async () => {
      const r = await fetchProtected("/api/billing/ui");
      if (!r.ok) return null;
      const j = (await r.json()) as {
        success?: boolean;
        data?: { plan: string; messagesLimit: number | null };
      };
      return j.data ?? null;
    },
    staleTime: 120_000,
  });
  const caps = billingUi?.plan != null ? getUiPlanCapabilities(billingUi.plan) : null;

  const { data: inboxQueues = [] } = useQuery({
    queryKey: ["inbox-operational-queues"],
    queryFn: fetchInboxOperationalQueues,
    staleTime: 60_000,
  });

  const { data: inboxOverview } = useQuery({
    queryKey: ["inbox-conversations", "tenant-total-global"],
    queryFn: () => fetchInboxConversations(undefined, null),
    staleTime: 30_000,
    refetchInterval: pollInterval,
  });
  const tenantThreadTotal = inboxOverview?.pagination.total;

  const { data: convData } = useQuery({
    queryKey: INBOX_QK.conversations(filter, lineFilter, queueFilter, priorityFilter),
    queryFn: () => fetchInboxConversations(filter, lineFilter, queueFilter, priorityFilter),
    refetchInterval: pollInterval,
  });

  const selectedThread = useMemo(
    () => convData?.threads.find((t) => t.id === selectedId) ?? null,
    [convData, selectedId]
  );

  const awaitingFirstMessage =
    tenantThreadTotal === 0 && convData !== undefined && lineFilter === null;

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileChat(true);
  }, []);

  const onBack = useCallback(() => {
    setMobileChat(false);
  }, []);

  const showSidebar = isMd || !mobileChat || !selectedId;
  const showChatColumn = isMd || (mobileChat && Boolean(selectedId));

  const statusPill = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      title={realtimeConnected ? "Tempo real ativo" : "A atualizar em intervalos…"}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${realtimeConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}
      />
      {realtimeConnected ? "Tempo real" : "A sincronizar"}
    </span>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/80">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <PageHeader
          eyebrow="Atendimento"
          title="Inbox"
          description={
            awaitingFirstMessage
              ? "Envie um teste do telemóvel para o número Business — a conversa surge na lista à esquerda."
              : "Escolha uma conversa à esquerda para ver e responder."
          }
          layout="split"
          size="compact"
          showDivider={false}
          className="!pb-0"
          actions={
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
              {statusPill}
              <SupportHelpButton variant="compact" className="rounded-lg px-2 py-1.5 no-underline hover:bg-slate-50" />
              <Link
                href="/settings"
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                Ajustes
              </Link>
            </div>
          }
        />
      </div>

      <div className="shrink-0 space-y-2 px-4 pb-2 sm:px-6">
        <PricingContextHint
          message={
            billingUi?.messagesLimit != null
              ? contextualInboxUsageHint(billingUi.messagesLimit)
              : CONTEXTUAL_UPGRADE_HINTS.inbox
          }
        />
        {caps && !caps.hasQueuesAndTags && FEATURE_UPGRADE_COPY.QUEUES_TAGS ? (
          <PricingContextHint message={FEATURE_UPGRADE_COPY.QUEUES_TAGS} />
        ) : null}
      </div>

      <InboxMetricsPanel
        onOpenThread={(id) => {
          setSelectedId(id);
          setMobileChat(true);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showSidebar && (
          <aside className="flex w-full shrink-0 flex-col border-r border-slate-100/90 bg-white md:w-[min(380px,40vw)]">
            <div className="flex items-center justify-between border-b border-slate-100/90 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Conversas</p>
              <OnlineUsersBadge />
            </div>
            <ConversationsList
              selectedId={selectedId}
              onSelect={onSelect}
              filter={filter}
              onFilterChange={setFilter}
              lineFilter={lineFilter}
              lines={lines}
              onLineFilterChange={setLineFilter}
              queueFilter={queueFilter}
              queues={inboxQueues}
              onQueueFilterChange={setQueueFilter}
              priorityFilter={priorityFilter}
              tenantThreadTotal={tenantThreadTotal}
            />
          </aside>
        )}

        {showChatColumn && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedId ? (
              <ChatWindow
                key={selectedId}
                threadId={selectedId}
                thread={selectedThread}
                showBack={!isMd}
                onBackMobile={onBack}
              />
            ) : awaitingFirstMessage ? (
              <div className="hidden min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 md:flex md:px-8">
                <div className="max-w-lg rounded-2xl border border-dashed border-slate-200/90 bg-white/95 px-6 py-8 shadow-sm">
                  <FirstConversationHint variant="main" lines={lines} />
                </div>
              </div>
            ) : (
              <div className="hidden min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center md:flex md:px-6">
                <div className="max-w-sm rounded-xl border border-dashed border-slate-200/90 bg-white/90 px-5 py-8 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Escolha uma conversa</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    As threads estão na coluna da esquerda. Selecione um contacto para ver o histórico e enviar respostas.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <SupportHelpButton variant="inline" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
