"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { readVerifyPayload } from "@/lib/api-json-client";
import { fetchProtected } from "@/lib/protected-fetch";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { inboxAssigneeCopy } from "@/lib/roleProductLabels";
import type { WaInboxThreadRow } from "./inboxTypes";
import type { ConversationState } from "@/modules/inbox/waInboxConversationState";
import { OperatorSuggestion } from "./OperatorSuggestion";
import { generateOperatorSuggestion } from "./operatorSuggestion";
import { aiStateFriendlyLabel, leadScoreHumanLabel, priorityGuidance } from "./leadPanelCopy";
import {
  deriveOperationalCrmPhase,
  OPERATIONAL_CRM_PHASE_LABEL_PT,
} from "@/modules/inbox/leadCrm";
import {
  conversationStateOperationalHint,
  conversationStateSuggestedActions,
  getConversationStateBadge,
} from "./conversationStateUi";
import { isWhiteLabelMode } from "@/lib/productMode";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";
import { DevFlowProspectPanel } from "./DevFlowProspectPanel";
import { isDevFlowProspectingEnabled } from "@/lib/devflowProspecting";
import { Button } from "@/components/ui/button";

type LeadTab = "resumo" | "proxima" | "crm" | "contexto";

const LEAD_TABS: { id: LeadTab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "proxima", label: "Próxima ação" },
  { id: "crm", label: "CRM" },
  { id: "contexto", label: "Contexto" },
];

function panelSection(title: string, children: ReactNode) {
  return (
    <section className="rounded-xl border border-border/85 bg-card/95 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h4 className="text-[10px] font-bold uppercase tracking-wide df-text-muted">{title}</h4>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function row(label: string, value: string | undefined | null) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">{label}</p>
      <p className="text-sm df-text-primary">{value}</p>
    </div>
  );
}

function scoreBar(score: number) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="space-y-1.5" data-testid="lead-score-bar">
      <div className="h-2 overflow-hidden rounded-full bg-muted ring-1 ring-[color:var(--df-ring-soft)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-[var(--df-brand-600)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs df-text-secondary">
        <span className="font-bold tabular-nums df-text-primary" data-testid="lead-score">
          {score}
        </span>{" "}
        / 100
      </p>
    </div>
  );
}

function priorityStripe(priority: string | undefined) {
  const stripe =
    priority === "HIGH"
      ? "bg-red-500"
      : priority === "MEDIUM"
        ? "bg-amber-500"
        : priority === "LOW"
          ? "bg-muted-foreground/35"
          : "bg-muted";
  return <div className={`h-1 w-full rounded-full ${stripe}`} aria-hidden data-testid="lead-priority-stripe" />;
}

export function LeadDataPanel({
  thread,
  className = "",
  evaluationMode = false,
  onClose,
}: {
  thread: WaInboxThreadRow | null;
  className?: string;
  evaluationMode?: boolean;
  /** Quando definido (ex.: drawer), mostra controlo para fechar sem alterar dados. */
  onClose?: () => void;
}) {
  const { role: sessionRole } = useSessionRole();
  const [tab, setTab] = useState<LeadTab>("resumo");
  const { data: authUser } = useQuery({
    queryKey: ["inbox-header-auth-user"],
    queryFn: async () => {
      const res = await fetchProtected("/api/auth/verify");
      const raw = await res.json();
      return readVerifyPayload(raw)?.user ?? null;
    },
    staleTime: 60_000,
  });

  if (!thread) return null;
  const devFlowProspectingUi = isDevFlowProspectingEnabled(sessionRole);
  const ld = thread.leadData;
  const score = thread.leadScore ?? 0;
  const scoreLabel = leadScoreHumanLabel(score);
  const stateLabel = aiStateFriendlyLabel(thread.aiState);
  const pg = priorityGuidance(thread.priority);
  const convState = thread.conversationState as ConversationState | undefined;
  const stateBadge = getConversationStateBadge(convState);
  const hint = conversationStateOperationalHint(convState);
  const bullets = conversationStateSuggestedActions(convState);
  const hasOperatorSuggestion = Boolean(generateOperatorSuggestion(thread));
  const assigneeCopy = thread.assignedToUser
    ? inboxAssigneeCopy({
        assignedToUser: thread.assignedToUser,
        isAssignedToMe: thread.isAssignedToMe,
        sessionRole,
        authUserId: authUser?.id,
        threadStatus: thread.status,
      })
    : null;
  const assignee =
    assigneeCopy && assigneeCopy.line
      ? assigneeCopy.line
      : thread.status === "CLOSED"
        ? "—"
        : "Sem responsável";

  const evaluationBlock = evaluationMode
    ? panelSection(
        isWhiteLabelMode() ? "Operação em configuração" : "Avaliação em andamento",
        isWhiteLabelMode() ? (
          <>
            <p className="text-xs leading-relaxed df-text-secondary">
              A operação está a ser configurada. Filas, equipa e volumes adicionais podem ser alinhados com o suporte.
            </p>
            <div className="pt-1">
              <SupportHelpButton variant="inline" className="text-xs" />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs leading-relaxed df-text-secondary">
              Ambiente de demonstração com limites de conversas e IA. Para operações completas (filas, equipa, volumes), é
              necessário ativar a operação com a implantação.
            </p>
            <p className="text-[11px] leading-relaxed df-text-muted">
              Veja consumo e próximos passos em Contrato e uso.
            </p>
          </>
        )
      )
    : null;

  const situacaoSection = panelSection(
    "Situação da conversa",
    <>
      <div className="flex flex-wrap items-center gap-2">
        {stateBadge ? (
          <span className={stateBadge.className} data-testid="lead-panel-state-badge">
            {stateBadge.label}
          </span>
        ) : (
          <span className="text-xs df-text-muted">Estado indisponível</span>
        )}
      </div>
      <div data-testid="operational-crm-phase">
        <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Fase comercial</p>
        <p className="text-sm font-medium df-text-primary">
          {
            OPERATIONAL_CRM_PHASE_LABEL_PT[
              deriveOperationalCrmPhase({
                threadStatus: thread.status,
                conversationState: convState,
              })
            ]
          }
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Responsável</p>
        <p className="text-sm font-medium df-text-primary" data-testid="lead-panel-assignee">
          {assignee}
        </p>
        {assigneeCopy?.note ? (
          <p className="mt-1 text-[11px] leading-snug text-emerald-900/85">{assigneeCopy.note}</p>
        ) : null}
      </div>
      {hint ? <p className="text-xs leading-relaxed df-text-secondary">{hint}</p> : null}
    </>
  );

  const glanceScoreSection = panelSection(
    "Prioridade e score",
    <>
      {thread.priority ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Prioridade CRM</p>
          {priorityStripe(thread.priority)}
          <p className="text-sm font-semibold df-text-primary">
            {thread.priority === "HIGH" ? "Alta" : thread.priority === "MEDIUM" ? "Média" : "Baixa"}
          </p>
        </div>
      ) : null}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Score</p>
        {scoreBar(score)}
        <p className="mt-1 text-sm df-text-primary" data-testid="lead-score-panel">
          <span className="df-text-secondary">{scoreLabel}</span>
        </p>
      </div>
    </>
  );

  const proximaSection = panelSection(
    "Próxima ação",
    bullets.length ? (
      <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed df-text-secondary">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    ) : (
      <p className="text-xs df-text-muted">Sem sugestões adicionais para este estado.</p>
    )
  );

  const crmDetailSection = panelSection(
    "CRM e dados extraídos",
    <>
      {thread.priority ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Prioridade CRM</p>
          {priorityStripe(thread.priority)}
          <p className="text-sm font-semibold df-text-primary">
            {thread.priority === "HIGH" ? "Alta" : thread.priority === "MEDIUM" ? "Média" : "Baixa"}
            {pg ? (
              <span className="font-normal df-text-secondary" title={pg.tooltip}>
                {" "}
                — {pg.line}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Score</p>
        {scoreBar(score)}
        <p className="mt-1 text-sm df-text-primary" data-testid="lead-score-panel-crm-tab">
          <span className="df-text-secondary">{scoreLabel}</span>
        </p>
      </div>
      {stateLabel ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">Funil (IA)</p>
          <p className="text-sm df-text-primary">{stateLabel}</p>
        </div>
      ) : null}
      {row("Nome", ld?.name)}
      {row("Interesse", ld?.interest)}
      {row("Orçamento", ld?.budget)}
      {row("Urgência", ld?.urgency)}
      {!ld?.name && !ld?.interest && !ld?.budget && !ld?.urgency ? (
        <p className="text-xs df-text-muted">Ainda não há dados extraídos das mensagens.</p>
      ) : null}
    </>
  );

  const contextoSection = panelSection(
    "Sugestão de ação",
    <>
      <OperatorSuggestion thread={thread} />
      {!hasOperatorSuggestion ? (
        <p className="text-xs df-text-muted">Nenhuma sugestão automática para este contexto.</p>
      ) : null}
    </>
  );

  return (
    <aside
      className={`flex flex-col border-border/90 bg-gradient-to-b from-muted/40/80 to-muted/40/40 ${className}`}
      aria-label="Painel da conversa e lead"
      data-testid="lead-panel"
    >
      <div className="border-b border-border/80 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wide df-text-secondary">Contexto do cliente</h3>
            <p className="mt-0.5 text-[10px] df-text-muted">Separado por separadores — menos ruído visual.</p>
          </div>
          {onClose ? (
            <Button variant="ghost"
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 df-text-muted transition hover:bg-muted hover:df-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2"
              aria-label="Fechar painel do cliente"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          ) : null}
        </div>
        <div
          className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2"
          role="tablist"
          aria-label="Secções do contexto"
        >
          {LEAD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-testid={`lead-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:text-[11px] ${
                tab === t.id
                  ? "bg-[var(--df-brand-600)] text-white shadow-sm"
                  : "bg-muted/60 text-[var(--df-text-secondary)] ring-1 ring-[var(--df-border-subtle)] hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-left">
        {tab === "resumo" ? (
          <>
            {evaluationBlock}
            {situacaoSection}
            {glanceScoreSection}
          </>
        ) : null}
        {tab === "proxima" ? proximaSection : null}
        {tab === "crm" ? (
          <>
            {crmDetailSection}
            {!evaluationMode && devFlowProspectingUi ? <DevFlowProspectPanel thread={thread} /> : null}
          </>
        ) : null}
        {tab === "contexto" ? contextoSection : null}
      </div>
    </aside>
  );
}
