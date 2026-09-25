"use client";

import { useMemo, useState } from "react";

import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  APPLICATION_LIFECYCLE_TRANSITIONS,
  APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT,
  analyzeInboundResponses,
  inboundEmailFromLocalEvidence,
  INBOUND_RESPONSE_KIND_LABELS_PT,
  mergeInboundResponseDetections,
  summarizeInboundResponseAnalysis,
  type ApplicationOutcome,
  type ApplyFlowApplication,
  type ApplyFlowPipelineStatusV2,
  type InboundEmail,
  type ResponseDetection,
} from "@devflow/applyflow-core";
import {
  persistInboundResponseConfirmation,
  persistInboundResponseDismissal,
} from "@/lib/persist-application-decision";
import {
  applyClosedLoopInboundIdentity,
  confirmLegacyClosedLoopAccountOwnership,
} from "@/lib/closed-loop-email-identity";
import {
  loadDashboardInboundResponses,
  persistDashboardInboundResponses,
} from "@/lib/local-inbound-response-storage";
import { fetchGmailClosedLoopInboundEmails } from "./gmail-closed-loop-inbound-client";
import { cn } from "@/lib/cn";

import {
  INBOUND_RESPONSE_ACCOUNT_LABEL,
  INBOUND_RESPONSE_AMBIGUOUS,
  INBOUND_RESPONSE_APPLICATION_LABEL,
  INBOUND_RESPONSE_BIND_LEGACY_DONE,
  INBOUND_RESPONSE_BIND_LEGACY_HINT,
  INBOUND_RESPONSE_BIND_LEGACY_LABEL,
  INBOUND_RESPONSE_CLASSIFICATION_LABEL,
  INBOUND_RESPONSE_CLASSIFY_LABEL,
  INBOUND_RESPONSE_CONFIDENCE_LABEL,
  INBOUND_RESPONSE_CONFIDENCE_LABELS,
  INBOUND_RESPONSE_CONFIRM_LABEL,
  INBOUND_RESPONSE_CONFIRMED_NOTE,
  INBOUND_RESPONSE_CONFIRMED_PREFIX,
  INBOUND_RESPONSE_DESCRIPTION,
  INBOUND_RESPONSE_DISMISS_LABEL,
  INBOUND_RESPONSE_DISMISSED_HINT,
  INBOUND_RESPONSE_DOMAIN_LABEL,
  INBOUND_RESPONSE_EMPTY,
  INBOUND_RESPONSE_EMPTY_NO_APPLIED,
  formatInboundAccountLabel,
  formatInboundAnalysisNotice,
  INBOUND_RESPONSE_EVIDENCE_LABEL,
  INBOUND_RESPONSE_EYEBROW,
  INBOUND_RESPONSE_GMAIL_HINT,
  INBOUND_RESPONSE_LOCAL_ONLY,
  INBOUND_RESPONSE_MATCH_LABEL,
  INBOUND_RESPONSE_MATCH_STATUS_LABELS,
  INBOUND_RESPONSE_NEED_ACCOUNT,
  INBOUND_RESPONSE_NEED_APPLICATION,
  INBOUND_RESPONSE_V2_CONFIRM_BLOCKED,
  INBOUND_RESPONSE_NO_AUTO,
  INBOUND_RESPONSE_PENDING_BADGE,
  INBOUND_RESPONSE_SCAN_BLOCKED,
  INBOUND_RESPONSE_SCAN_DISABLED,
  INBOUND_RESPONSE_SCAN_GMAIL_LABEL,
  INBOUND_RESPONSE_STATUS_LABEL,
  INBOUND_RESPONSE_SUBJECT_LABEL,
  INBOUND_RESPONSE_TITLE,
  INBOUND_RESPONSE_UNMATCHED,
} from "./inbound-application-response-content";

const fieldClass = cn(
  "w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-bg-soft)] px-3 py-2.5 text-sm text-[color:var(--af-text)]",
  "focus:border-emerald-500/50 focus:outline-none",
);

function confidenceTone(level: ResponseDetection["classificationConfidence"]): ApplyFlowBadgeTone {
  if (level === "high") return "success";
  if (level === "medium") return "warning";
  return "neutral";
}

function allowedStatuses(fromStatus: ApplyFlowPipelineStatusV2 | undefined): ApplyFlowPipelineStatusV2[] {
  if (!fromStatus) return [];
  return [fromStatus, ...APPLICATION_LIFECYCLE_TRANSITIONS[fromStatus].filter((status) => status !== fromStatus)];
}

export function InboundApplicationResponsePanelView({
  detections,
  applications,
  selectedStatusById,
  selectedApplicationById,
  persistError,
  notice,
  hasAppliedApplications,
  isScanning,
  gmailRuntimeEnabled = false,
  onClassify,
  onScanGmail,
  onConfirm,
  onDismiss,
  onStatusChange,
  onApplicationChange,
  senderDomain,
  subjectHint,
  onSenderDomainChange,
  onSubjectHintChange,
  accountScopes = [],
  selectedAccountScope = "",
  onAccountScopeChange,
  pendingLegacyBindScope,
  onConfirmLegacyOwnership,
}: {
  detections: ResponseDetection[];
  applications: readonly ApplyFlowApplication[];
  selectedStatusById: Record<string, ApplyFlowPipelineStatusV2 | "">;
  selectedApplicationById: Record<string, string>;
  persistError: string | null;
  notice: string | null;
  hasAppliedApplications: boolean;
  isScanning: boolean;
  gmailRuntimeEnabled?: boolean;
  onClassify: () => void;
  onScanGmail: () => void;
  onConfirm: (detectionId: string) => void;
  onDismiss: (detectionId: string) => void;
  onStatusChange: (detectionId: string, status: ApplyFlowPipelineStatusV2 | "") => void;
  onApplicationChange: (detectionId: string, applicationId: string) => void;
  senderDomain: string;
  subjectHint: string;
  onSenderDomainChange: (value: string) => void;
  onSubjectHintChange: (value: string) => void;
  accountScopes?: readonly string[];
  selectedAccountScope?: string;
  onAccountScopeChange?: (value: string) => void;
  pendingLegacyBindScope?: string;
  onConfirmLegacyOwnership?: () => void;
}) {
  const pending = detections.filter((item) => item.state === "pending_review");
  return (
    <ApplyFlowSection
      id="inbound-responses"
      eyebrow={INBOUND_RESPONSE_EYEBROW}
      title={INBOUND_RESPONSE_TITLE}
      description={INBOUND_RESPONSE_DESCRIPTION}
    >
      <div className="grid gap-4">
        <ApplyFlowCard variant="muted" padding="md">
          <p className="text-xs text-[color:var(--af-text-muted)]">{INBOUND_RESPONSE_NO_AUTO}</p>
          <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
            {gmailRuntimeEnabled ? INBOUND_RESPONSE_GMAIL_HINT : INBOUND_RESPONSE_SCAN_DISABLED}
          </p>
          <form
            className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              onClassify();
            }}
          >
            <label className="grid gap-1 text-xs text-[color:var(--af-text-muted)]">
              {INBOUND_RESPONSE_DOMAIN_LABEL}
              <input
                className={fieldClass}
                value={senderDomain}
                onChange={(event) => onSenderDomainChange(event.target.value)}
                placeholder="bluelightconsulting.com"
                autoComplete="off"
                data-testid="inbound-response-domain"
              />
            </label>
            <label className="grid gap-1 text-xs text-[color:var(--af-text-muted)]">
              {INBOUND_RESPONSE_SUBJECT_LABEL}
              <input
                className={fieldClass}
                value={subjectHint}
                onChange={(event) => onSubjectHintChange(event.target.value)}
                placeholder="Interview invitation"
                autoComplete="off"
                data-testid="inbound-response-subject"
              />
            </label>
            <ApplyFlowButton type="submit" variant="primary" size="md" disabled={!senderDomain.trim()}>
              {INBOUND_RESPONSE_CLASSIFY_LABEL}
            </ApplyFlowButton>
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="md"
              disabled={isScanning || !gmailRuntimeEnabled}
              onClick={onScanGmail}
            >
              {isScanning ? "A ler Gmail…" : INBOUND_RESPONSE_SCAN_GMAIL_LABEL}
            </ApplyFlowButton>
          </form>
          {accountScopes.length > 0 && onAccountScopeChange ? (
            <label className="mt-3 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
              {INBOUND_RESPONSE_ACCOUNT_LABEL}
              <select
                className={fieldClass}
                value={selectedAccountScope}
                onChange={(event) => onAccountScopeChange(event.target.value)}
                data-testid="inbound-response-account-scope"
              >
                <option value="">Seleciona a conta</option>
                {accountScopes.map((scope, index) => (
                  <option key={scope} value={scope}>
                    {formatInboundAccountLabel(scope, index)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {pendingLegacyBindScope && onConfirmLegacyOwnership ? (
            <div className="mt-3 grid gap-2">
              <p className="text-xs text-[color:var(--af-text-muted)]">{INBOUND_RESPONSE_BIND_LEGACY_HINT}</p>
              <ApplyFlowButton type="button" variant="outlineBrand" size="md" onClick={onConfirmLegacyOwnership}>
                {INBOUND_RESPONSE_BIND_LEGACY_LABEL}
              </ApplyFlowButton>
            </div>
          ) : null}
          <p className="mt-2 text-[11px] text-[color:var(--af-text-muted)]">{INBOUND_RESPONSE_LOCAL_ONLY}</p>
        </ApplyFlowCard>

        {persistError ? (
          <ApplyFlowCard variant="danger" padding="md" role="alert">
            <p className="text-sm text-red-100">{persistError}</p>
          </ApplyFlowCard>
        ) : null}
        {notice ? (
          <ApplyFlowCard variant="success" padding="md">
            <p className="text-sm text-emerald-100/95">{notice}</p>
          </ApplyFlowCard>
        ) : null}

        {pending.length === 0 ? (
          <ApplyFlowCard variant="muted" padding="md">
            <p className="text-sm text-[color:var(--af-text)]">
              {hasAppliedApplications ? INBOUND_RESPONSE_EMPTY : INBOUND_RESPONSE_EMPTY_NO_APPLIED}
            </p>
          </ApplyFlowCard>
        ) : (
          <ul className="grid gap-3">
            {pending.map((detection) => {
              const selectedApp = selectedApplicationById[detection.id] ?? detection.applicationId ?? "";
              const selectedStatus = selectedStatusById[detection.id] ?? detection.suggestedStatus ?? "";
              return (
                <li key={detection.id}>
                  <ApplyFlowCard
                    variant={
                      detection.classification === "rejection"
                        ? "danger"
                        : detection.classification === "offer"
                          ? "success"
                          : "highlight"
                    }
                    padding="md"
                    data-testid={`inbound-response-proposal-${detection.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[color:var(--af-text)]">{detection.headline}</p>
                        {detection.jobTitle ? (
                          <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{detection.jobTitle}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <ApplyFlowBadge tone="intel">{INBOUND_RESPONSE_PENDING_BADGE}</ApplyFlowBadge>
                        <ApplyFlowBadge tone={confidenceTone(detection.classificationConfidence)}>
                          {INBOUND_RESPONSE_CONFIDENCE_LABEL}{" "}
                          {INBOUND_RESPONSE_CONFIDENCE_LABELS[detection.classificationConfidence]}
                        </ApplyFlowBadge>
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-[color:var(--af-text-muted)] sm:grid-cols-2">
                      <div>
                        <dt className="uppercase tracking-wide">{INBOUND_RESPONSE_MATCH_LABEL}</dt>
                        <dd className="mt-0.5 text-[color:var(--af-text)]">
                          {detection.matchStatus === "unmatched"
                            ? INBOUND_RESPONSE_UNMATCHED
                            : detection.matchStatus === "ambiguous"
                              ? INBOUND_RESPONSE_AMBIGUOUS
                              : INBOUND_RESPONSE_MATCH_STATUS_LABELS[detection.matchStatus]}
                          {" · "}
                          {INBOUND_RESPONSE_CONFIDENCE_LABELS[detection.matchConfidence]}
                        </dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide">{INBOUND_RESPONSE_CLASSIFICATION_LABEL}</dt>
                        <dd className="mt-0.5 text-[color:var(--af-text)]">
                          {INBOUND_RESPONSE_KIND_LABELS_PT[detection.classification]}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <p className="text-[11px] uppercase tracking-wide text-[color:var(--af-text-muted)]">
                        {INBOUND_RESPONSE_EVIDENCE_LABEL}
                      </p>
                      <ul className="mt-1 list-inside list-disc text-sm text-[color:var(--af-text)]">
                        {[...detection.matchEvidence, ...detection.classificationEvidence].map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {(detection.matchStatus !== "matched" || detection.alternateApplicationIds?.length) ? (
                      <label className="mt-3 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
                        {INBOUND_RESPONSE_APPLICATION_LABEL}
                        <select
                          className={cn(fieldClass, "max-w-lg py-2")}
                          value={selectedApp}
                          onChange={(event) => onApplicationChange(detection.id, event.target.value)}
                        >
                          <option value="">Seleccionar candidatura</option>
                          {applications.map((item) => (
                            <option key={item.id} value={item.id}>
                              {[item.companyName, item.jobTitle].filter(Boolean).join(" · ") || item.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {detection.fromStatus ? (
                      <label className="mt-3 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
                        {INBOUND_RESPONSE_STATUS_LABEL}
                        <select
                          className={cn(fieldClass, "max-w-xs py-2")}
                          value={selectedStatus}
                          onChange={(event) =>
                            onStatusChange(detection.id, event.target.value as ApplyFlowPipelineStatusV2)
                          }
                        >
                          <option value="">Sem mudança de estágio</option>
                          {allowedStatuses(detection.fromStatus).map((status) => (
                            <option key={status} value={status}>
                              {APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ApplyFlowButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onConfirm(detection.id)}
                        data-testid={`inbound-response-confirm-${detection.id}`}
                      >
                        {INBOUND_RESPONSE_CONFIRM_LABEL}
                      </ApplyFlowButton>
                      <ApplyFlowButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(detection.id)}
                        data-testid={`inbound-response-dismiss-${detection.id}`}
                      >
                        {INBOUND_RESPONSE_DISMISS_LABEL}
                      </ApplyFlowButton>
                    </div>
                  </ApplyFlowCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ApplyFlowSection>
  );
}

export function InboundApplicationResponsePanel({
  applications,
  outcomes = [],
  emails = [],
  gmailRuntimeEnabled = false,
  persistenceV2Enabled = false,
  onApplicationUpdated,
}: {
  applications: readonly ApplyFlowApplication[];
  outcomes?: readonly ApplicationOutcome[];
  emails?: readonly InboundEmail[];
  gmailRuntimeEnabled?: boolean;
  persistenceV2Enabled?: boolean;
  onApplicationUpdated?: (application: ApplyFlowApplication) => void;
}) {
  const [senderDomain, setSenderDomain] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [localEmails, setLocalEmails] = useState<InboundEmail[]>([]);
  const [detections, setDetections] = useState<ResponseDetection[]>(() => loadDashboardInboundResponses().detections);
  const [selectedStatusById, setSelectedStatusById] = useState<Record<string, ApplyFlowPipelineStatusV2 | "">>({});
  const [selectedApplicationById, setSelectedApplicationById] = useState<Record<string, string>>({});
  const [persistError, setPersistError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [accountScopes, setAccountScopes] = useState<string[]>([]);
  const [selectedAccountScope, setSelectedAccountScope] = useState("");
  const [pendingLegacyBindScope, setPendingLegacyBindScope] = useState<string | undefined>();

  const hasAppliedApplications = applications.some((item) => item.status !== "reviewing" && item.status !== "ignored");

  const pendingSourceEmails = useMemo(() => [...emails, ...localEmails], [emails, localEmails]);

  function rebuild(
    nextEmails: InboundEmail[],
    existing = detections,
    persistOptions?: { legacyClosedLoopAccountScope?: string | null },
  ) {
    const analysis = analyzeInboundResponses({
      emails: nextEmails,
      applications,
      outcomes,
      existing,
    });
    const next = mergeInboundResponseDetections(existing, analysis.detections);
    setDetections(next);
    persistDashboardInboundResponses(next, persistOptions);
    setNotice(formatInboundAnalysisNotice(summarizeInboundResponseAnalysis(analysis, existing)));
    return next;
  }

  function classifyLocal() {
    const email = inboundEmailFromLocalEvidence({ senderDomain, subject: subjectHint });
    if (!email) return;
    setLocalEmails((current) => [...current.filter((item) => item.id !== email.id), email]);
    rebuild([...pendingSourceEmails.filter((item) => item.id !== email.id), email]);
    setSubjectHint("");
    setPersistError(null);
  }

  async function scanGmail() {
    if (!gmailRuntimeEnabled) return;
    setIsScanning(true);
    setPersistError(null);
    const outcome = await fetchGmailClosedLoopInboundEmails({
      accountScope: selectedAccountScope || undefined,
    });
    setIsScanning(false);
    if (!outcome.ok) {
      setPersistError(INBOUND_RESPONSE_SCAN_BLOCKED);
      return;
    }
    if (outcome.result.accountScopes?.length) {
      setAccountScopes(outcome.result.accountScopes);
      if (!selectedAccountScope && outcome.result.accountScopes.length === 1) {
        setSelectedAccountScope(outcome.result.accountScopes[0] ?? "");
      }
    }
    if (outcome.result.status !== "completed" || outcome.result.warnings?.includes("need_account_selection")) {
      setPersistError(
        outcome.result.warnings?.includes("need_account_selection")
          ? INBOUND_RESPONSE_NEED_ACCOUNT
          : INBOUND_RESPONSE_SCAN_BLOCKED,
      );
      return;
    }
    const stored = loadDashboardInboundResponses();
    const resolved = applyClosedLoopInboundIdentity({
      emails: outcome.result.emails,
      accountScopes: outcome.result.accountScopes,
      existingEmailIds: stored.detections.map((item) => item.emailId),
      legacyOwnerScope: stored.legacyClosedLoopAccountScope,
      selectedAccountScope: selectedAccountScope || undefined,
    });
    const scannedScope = resolved.emails.find((item) => item.accountScope)?.accountScope ?? selectedAccountScope;
    setPendingLegacyBindScope(
      stored.detections.length > 0 && !stored.legacyClosedLoopAccountScope && scannedScope
        ? scannedScope
        : undefined,
    );
    if (resolved.emails.length === 0) {
      setNotice("Leitura Gmail concluída. Nenhuma mensagem relacionada foi detectada.");
      return;
    }
    rebuild([...pendingSourceEmails, ...resolved.emails], detections);
  }

  function confirmLegacyOwnership() {
    if (!pendingLegacyBindScope) return;
    const stored = loadDashboardInboundResponses();
    const confirmed = confirmLegacyClosedLoopAccountOwnership({
      existingEmailIds: stored.detections.map((item) => item.emailId),
      currentOwnerScope: stored.legacyClosedLoopAccountScope,
      selectedAccountScope: pendingLegacyBindScope,
    });
    if (!confirmed.ok) {
      setPersistError(INBOUND_RESPONSE_NEED_ACCOUNT);
      return;
    }
    persistDashboardInboundResponses(stored.detections, {
      legacyClosedLoopAccountScope: confirmed.legacyOwnerScope,
    });
    setPendingLegacyBindScope(undefined);
    setPersistError(null);
    setNotice(INBOUND_RESPONSE_BIND_LEGACY_DONE);
  }

  function confirmDetection(detectionId: string) {
    if (persistenceV2Enabled) {
      setPersistError(INBOUND_RESPONSE_V2_CONFIRM_BLOCKED);
      setNotice(null);
      return;
    }
    const detection = detections.find((item) => item.id === detectionId);
    if (!detection) return;
    const applicationId = selectedApplicationById[detection.id] ?? detection.applicationId;
    const application = applications.find((item) => item.id === applicationId);
    if (!application) {
      setPersistError(INBOUND_RESPONSE_NEED_APPLICATION);
      return;
    }
    const selectedStatus = selectedStatusById[detection.id];
    const persisted = persistInboundResponseConfirmation({
      application,
      detection,
      selectedApplicationId: application.id,
      toStatus: selectedStatus === "" ? null : selectedStatus,
    });
    if (!persisted.ok) {
      setPersistError(persisted.error);
      setNotice(null);
      return;
    }
    setDetections((current) =>
      mergeInboundResponseDetections(current, [persisted.detection]),
    );
    setPersistError(null);
    const label = persisted.detection.suggestedStatus
      ? APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[persisted.application.status === "interview" ? "screening" : persisted.detection.suggestedStatus]
      : null;
    setNotice(
      persisted.unchanged || !persisted.detection.pipelineChange
        ? INBOUND_RESPONSE_CONFIRMED_NOTE
        : `${INBOUND_RESPONSE_CONFIRMED_PREFIX} ${label ?? APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT.screening}`,
    );
    onApplicationUpdated?.(persisted.application);
  }

  return (
    <InboundApplicationResponsePanelView
      detections={detections}
      applications={applications}
      selectedStatusById={selectedStatusById}
      selectedApplicationById={selectedApplicationById}
      persistError={persistError}
      notice={notice}
      hasAppliedApplications={hasAppliedApplications}
      isScanning={isScanning}
      gmailRuntimeEnabled={gmailRuntimeEnabled}
      onClassify={classifyLocal}
      onScanGmail={() => {
        void scanGmail();
      }}
      onConfirm={confirmDetection}
      onDismiss={(detectionId) => {
        const detection = detections.find((item) => item.id === detectionId);
        if (!detection) return;
        const dismissed = persistInboundResponseDismissal(detection);
        if (!dismissed.ok) {
          setPersistError(dismissed.error);
          return;
        }
        setDetections((current) => mergeInboundResponseDetections(current, [dismissed.detection]));
        setNotice(INBOUND_RESPONSE_DISMISSED_HINT);
        setPersistError(null);
      }}
      onStatusChange={(detectionId, status) => {
        setSelectedStatusById((current) => ({ ...current, [detectionId]: status }));
      }}
      onApplicationChange={(detectionId, applicationId) => {
        setSelectedApplicationById((current) => ({ ...current, [detectionId]: applicationId }));
      }}
      senderDomain={senderDomain}
      subjectHint={subjectHint}
      onSenderDomainChange={setSenderDomain}
      onSubjectHintChange={setSubjectHint}
      accountScopes={accountScopes}
      selectedAccountScope={selectedAccountScope}
      onAccountScopeChange={setSelectedAccountScope}
      pendingLegacyBindScope={pendingLegacyBindScope}
      onConfirmLegacyOwnership={confirmLegacyOwnership}
    />
  );
}
