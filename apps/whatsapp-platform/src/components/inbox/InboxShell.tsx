"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ConversationsList } from "./ConversationsList";
import { ChatWindow } from "./ChatWindow";
import {
  fetchInboxConversations,
  fetchInboxOperationalQueues,
  fetchInboxProspectMetrics,
  fetchTenantWhatsappLines,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter, InboxProspectLens } from "./inboxTypes";
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
import type { TenantBillingUI } from "@/modules/billing";
import { normalizePlan } from "@/modules/billing/plans";
import {
  dismissFirstReplyBanner,
  ensureFirstMessageActivationLogged,
  getActivationState,
  markFirstMessageToastSeen,
  markFirstReplyToastSeen,
} from "@/lib/activationStorage";
import { useShellLayoutOptional } from "@/components/shell/ShellLayoutContext";
import { isWhiteLabelMode } from "@/lib/productMode";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { isDevFlowProspectingEnabled } from "@/lib/devflowProspecting";
import { Button } from "@/components/ui/button";

const INBOX_FOCUS_MODE_KEY = "df-inbox-focus-mode";

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
  const pathname = usePathname();
  const router = useRouter();
  const isMd = useMediaMd();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [activationPickFirst, setActivationPickFirst] = useState(false);
  const [activationUi, setActivationUi] = useState(() =>
    typeof window !== "undefined"
      ? getActivationState()
      : ({} as ReturnType<typeof getActivationState>)
  );
  const [filter, setFilter] = useState<InboxConversationsFilter>("needs_response");
  const [lineFilter, setLineFilter] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [prospectLens, setProspectLens] = useState<InboxProspectLens | null>(null);
  const [inboxFocusMode, setInboxFocusMode] = useState(false);
  const { connected: realtimeConnected } = useInboxRealtime();
  const { role: sessionRole, loading: roleLoading } = useSessionRole();
  const prospectingEnabled = useMemo(() => isDevFlowProspectingEnabled(sessionRole), [sessionRole]);
  const effectiveProspectLens = prospectingEnabled ? prospectLens : null;

  const shellLayout = useShellLayoutOptional();
  const shellSidebarCollapsed = Boolean(shellLayout?.sidebarCollapsed);
  const metricsCompact = inboxFocusMode || shellSidebarCollapsed;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem(INBOX_FOCUS_MODE_KEY) === "1") setInboxFocusMode(true);
      } catch {
        /* ignore */
      }
    });
  }, []);

  const toggleInboxFocusMode = useCallback(() => {
    setInboxFocusMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(INBOX_FOCUS_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const threadFromUrl = searchParams.get("thread")?.trim() ?? "";

  useEffect(() => {
    if (!threadFromUrl) return;
    queueMicrotask(() => {
      setSelectedId(threadFromUrl);
      setMobileChat(true);
    });
  }, [threadFromUrl]);

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

    queueMicrotask(() => {
      setFilter(nextPhase);
      setPriorityFilter(nextPriority);
    });
  }, [searchParams]);

  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data: lines = [] } = useQuery({
    queryKey: INBOX_QK.phoneLines,
    queryFn: fetchTenantWhatsappLines,
    staleTime: 60_000,
  });

  const channelAwaitingActivation = useMemo(
    () => lines.some((l) => l.status === "PENDING_ACTIVATION"),
    [lines]
  );

  const { data: billingUi } = useQuery({
    queryKey: ["tenant-billing-ui"],
    queryFn: async () => {
      const r = await fetchProtected("/api/billing/ui");
      if (!r.ok) return null;
      const j = (await r.json()) as { success?: boolean; data?: TenantBillingUI };
      return j.data ?? null;
    },
    staleTime: 120_000,
    enabled: !isWhiteLabelMode(),
  });
  const evaluationMode = Boolean(billingUi && normalizePlan(billingUi.plan) === "FREE");
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

  useEffect(() => {
    const sync = () => setActivationUi(getActivationState());
    sync();
    window.addEventListener("df-activation-update", sync);
    return () => window.removeEventListener("df-activation-update", sync);
  }, []);

  useEffect(() => {
    if (tenantThreadTotal == null) return;
    ensureFirstMessageActivationLogged(tenantThreadTotal);
  }, [tenantThreadTotal]);

  const { data: prospectMetrics } = useQuery({
    queryKey: ["inbox-prospect-metrics"],
    queryFn: fetchInboxProspectMetrics,
    staleTime: 45_000,
    refetchInterval: pollInterval,
    enabled: prospectingEnabled && !roleLoading,
  });

  const { data: convData } = useQuery({
    queryKey: INBOX_QK.conversations(filter, lineFilter, queueFilter, priorityFilter, effectiveProspectLens),
    queryFn: () =>
      fetchInboxConversations(filter, lineFilter, queueFilter, priorityFilter, effectiveProspectLens),
    refetchInterval: pollInterval,
  });

  const selectedThread = useMemo(
    () => convData?.threads.find((t) => t.id === selectedId) ?? null,
    [convData, selectedId]
  );

  const awaitingFirstMessage =
    tenantThreadTotal === 0 && convData !== undefined && lineFilter === null;

  const hasFirstReplyRecorded = Boolean(activationUi.firstReplyAt);
  const showFirstMessageCelebration =
    (tenantThreadTotal ?? 0) > 0 &&
    !activationUi.firstMessageToastSeen &&
    !hasFirstReplyRecorded;
  const showFirstReplyCelebration =
    hasFirstReplyRecorded && !activationUi.firstReplyToastSeen;
  const showFirstReplyGate =
    (tenantThreadTotal ?? 0) > 0 &&
    !hasFirstReplyRecorded &&
    !activationUi.firstReplyBannerDismissed &&
    Boolean(activationUi.firstMessageToastSeen);

  const selectThread = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMobileChat(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("thread", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const onSelect = selectThread;

  useEffect(() => {
    if (!activationPickFirst) return;
    const threads = convData?.threads;
    if (!threads?.length) return;
    const first = threads[0];
    if (first?.id) {
      queueMicrotask(() => {
        selectThread(first.id);
        setActivationPickFirst(false);
      });
    }
  }, [activationPickFirst, convData?.threads, selectThread]);

  const onBack = useCallback(() => {
    setMobileChat(false);
  }, []);

  const showSidebar = isMd || !mobileChat || !selectedId;
  const showChatColumn = isMd || (mobileChat && Boolean(selectedId));

  const statusPill = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border df-border-brand bg-[var(--df-bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--df-text-secondary)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      title={realtimeConnected ? "Tempo real ativo" : "A atualizar em intervalos…"}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${realtimeConnected ? "bg-[rgb(34_197_94)]" : "bg-[rgb(251_191_36)] animate-pulse"}`}
      />
      {realtimeConnected ? "Tempo real" : "A sincronizar"}
    </span>
  );

  return (
    <div
      className={`df-page flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${
        shellSidebarCollapsed ? "lg:max-w-none" : ""
      }`}
      data-testid="inbox-shell"
    >
      {channelAwaitingActivation ? (
        <div className="df-feedback-warning shrink-0 rounded-none border-x-0 border-t-0 px-4 py-3 text-sm leading-relaxed sm:px-6" role="status">
          Seu canal está em ativação. Assim que aprovado, você poderá responder mensagens aqui.
        </div>
      ) : null}
        <div
          className={`shrink-0 border-b df-border-brand bg-[var(--df-bg-elevated)] shadow-[0_1px_0_rgba(15,23,42,0.04)] ${
          inboxFocusMode ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-4 py-4 sm:px-6 sm:py-5"
        }`}
      >
        <PageHeader
          eyebrow="Atendimento"
          title="Inbox"
          description={
            inboxFocusMode
              ? undefined
              : awaitingFirstMessage
                ? "Envie uma mensagem para o seu número para testar — a conversa aparece na lista à esquerda."
                : "Escolha uma conversa à esquerda para ver e responder."
          }
          layout="split"
          size="compact"
          showDivider={false}
          className="!pb-0"
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
              {shellLayout ? (
                <Button variant="secondary"
                  type="button"
                  onClick={() => shellLayout.toggleSidebar()}
                  className="hidden rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-2 py-1.5 text-xs font-medium text-[var(--df-text-secondary)] shadow-sm transition hover:bg-[var(--df-brand-100)] lg:inline-flex"
                  title="Menu compacto com ícones — mais espaço para o conteúdo. Clique de novo para expandir."
                >
                  {shellSidebarCollapsed ? "Expandir menu" : "Menu compacto"}
                </Button>
              ) : null}
              <Button variant="secondary"
                type="button"
                onClick={toggleInboxFocusMode}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm transition ${
                  inboxFocusMode
                    ? "border-[var(--df-brand-300)] bg-[var(--df-brand-50)] text-[var(--df-brand-900)]"
                    : "border-[var(--df-border-subtle)] bg-[var(--df-bg-elevated)] text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)]"
                }`}
                title="Menos cabeçalho e métricas — mais espaço para mensagens"
              >
                {inboxFocusMode ? "Sair do modo foco" : "Modo foco"}
              </Button>
              {statusPill}
              <SupportHelpButton variant="compact" className="rounded-lg px-2 py-1.5 no-underline hover:bg-muted/60" />
              <Link
                href="/settings"
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--df-text-secondary)] transition hover:bg-[var(--df-brand-100)] hover:text-[var(--df-text-primary)]"
              >
                Ajustes
              </Link>
            </div>
          }
        />
      </div>

      {(showFirstMessageCelebration || showFirstReplyCelebration || showFirstReplyGate) && (
        <div className="shrink-0 space-y-2 px-4 pb-2 sm:px-6">
          {showFirstMessageCelebration ? (
            <div
              className="df-feedback-success flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <div>
                <p className="text-sm font-semibold">Primeira mensagem recebida 🎉</p>
                <p className="mt-0.5 text-xs opacity-90">Agora você pode começar a atender seus clientes.</p>
              </div>
              <Button
                variant="primary"
                type="button"
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
                onClick={() => {
                  markFirstMessageToastSeen();
                  setActivationUi(getActivationState());
                }}
              >
                Entendi
              </Button>
            </div>
          ) : null}
          {showFirstReplyCelebration ? (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[var(--df-brand-200)] bg-[var(--df-brand-50)]/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <div>
                <p className="text-sm font-semibold df-text-primary">Primeiro atendimento realizado 🚀</p>
                <p className="mt-0.5 text-xs df-text-secondary">Seu sistema já está funcionando.</p>
              </div>
              <Button variant="secondary"
                type="button"
                className="shrink-0 rounded-lg bg-[var(--df-brand-600)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--df-brand-700)]"
                onClick={() => {
                  markFirstReplyToastSeen();
                  setActivationUi(getActivationState());
                }}
              >
                Ótimo
              </Button>
            </div>
          ) : null}
          {showFirstReplyGate ? (
            <div
              className="df-feedback-warning flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="region"
              aria-label="Primeira resposta"
            >
              <div>
                <p className="text-sm font-semibold">Vamos responder sua primeira mensagem?</p>
                <p className="mt-0.5 text-xs opacity-90">Esse é o momento onde seu atendimento começa.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="primary"
                  type="button"
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    setFilter("needs_response");
                    setActivationPickFirst(true);
                  }}
                >
                  Responder agora
                </Button>
                <Button variant="secondary"
                  type="button"
                  className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs font-medium df-text-primary hover:bg-muted/60"
                  onClick={() => {
                    dismissFirstReplyBanner();
                    setActivationUi(getActivationState());
                  }}
                >
                  Agora não
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!inboxFocusMode && !isWhiteLabelMode() ? (
        <div
          className={`shrink-0 space-y-2 px-4 pb-2 sm:px-6 ${shellSidebarCollapsed ? "pt-0.5" : ""}`}
        >
          <PricingContextHint
            message={
              billingUi?.messagesLimit != null
                ? contextualInboxUsageHint(billingUi.messagesLimit, {
                    isFreePlan: billingUi.allowsMeteredOverage === false,
                    messagesUsed: billingUi.messagesUsed,
                  })
                : CONTEXTUAL_UPGRADE_HINTS.inbox
            }
          />
          {caps && !caps.hasQueuesAndTags && FEATURE_UPGRADE_COPY.QUEUES_TAGS ? (
            <PricingContextHint message={FEATURE_UPGRADE_COPY.QUEUES_TAGS} />
          ) : null}
        </div>
      ) : null}

      {inboxFocusMode ? null : metricsCompact ? (
        <details className="group shrink-0 border-b df-border-brand bg-[var(--df-bg-app)]/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--df-text-secondary)] marker:content-none [&::-webkit-details-marker]:hidden sm:px-4">
            <span>Métricas e equipa</span>
            <span className="text-[10px] text-[var(--df-text-muted)] transition group-open:rotate-180" aria-hidden>
              ▼
            </span>
          </summary>
          <InboxMetricsPanel onOpenThread={selectThread} />
        </details>
      ) : (
        <InboxMetricsPanel onOpenThread={selectThread} />
      )}

      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden md:flex-row md:items-stretch">
        {showSidebar && (
          <aside
            className={`df-surface flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-r md:max-w-none ${
              shellSidebarCollapsed
                ? "md:w-[248px] md:min-w-[240px] md:max-w-[260px] xl:w-[272px] xl:min-w-[260px] xl:max-w-[272px]"
                : "md:w-[260px] md:min-w-[240px] md:max-w-[280px] xl:w-[300px] xl:min-w-[280px] xl:max-w-[300px]"
            }`}
          >
            <div className="flex items-center justify-between border-b df-border-brand px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--df-text-muted)]">Conversas</p>
              <OnlineUsersBadge />
            </div>
            <ConversationsList
              selectedId={selectedId}
              onSelect={onSelect}
              filter={filter}
              onFilterChange={(f) => {
                setFilter(f);
                setProspectLens(null);
              }}
              lineFilter={lineFilter}
              lines={lines}
              onLineFilterChange={setLineFilter}
              queueFilter={queueFilter}
              queues={inboxQueues}
              onQueueFilterChange={setQueueFilter}
              priorityFilter={priorityFilter}
              prospectLens={prospectLens}
              onProspectLensChange={prospectingEnabled ? setProspectLens : undefined}
              prospectMetrics={prospectMetrics}
              prospectUiEnabled={prospectingEnabled}
              tenantThreadTotal={tenantThreadTotal}
            />
          </aside>
        )}

        {showChatColumn && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {selectedId ? (
              <ChatWindow
                key={selectedId}
                threadId={selectedId}
                thread={selectedThread}
                showBack={!isMd}
                onBackMobile={onBack}
                evaluationMode={evaluationMode}
                compactChrome={inboxFocusMode}
                shellSidebarCollapsed={shellSidebarCollapsed}
                inboxFocusMode={inboxFocusMode}
              />
            ) : awaitingFirstMessage ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 md:px-8">
                <div className="max-w-lg rounded-2xl border border-dashed df-border-brand bg-[var(--df-bg-elevated)]/95 px-6 py-8 shadow-sm">
                  <FirstConversationHint variant="main" lines={lines} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center md:px-6">
                <div className="max-w-sm rounded-xl border border-dashed df-border-brand bg-[var(--df-bg-elevated)]/90 px-5 py-8 shadow-sm">
                  <p className="text-sm font-semibold text-[var(--df-text-primary)]">Escolha uma conversa</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--df-text-secondary)]">
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
