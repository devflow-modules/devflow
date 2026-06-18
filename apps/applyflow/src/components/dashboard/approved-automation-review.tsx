"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  CAREER_AUTOMATION_KIND_MAP,
  buildCareerAutomationToolInput,
  resolveCareerToolDefinition,
  type CareerAutomationExecutionResult,
  type CareerAutomationKind,
  type CareerBundle,
} from "@devflow/career-core";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { useMemo, useRef, useState } from "react";
import {
  APPROVED_AUTOMATION_ALREADY_RUNNING_MESSAGE,
  APPROVED_AUTOMATION_APPROVAL_REQUIRED_MESSAGE,
  APPROVED_AUTOMATION_APPROVE_ONCE_LABEL,
  APPROVED_AUTOMATION_BADGE_MANUAL,
  APPROVED_AUTOMATION_BADGE_SINGLE,
  APPROVED_AUTOMATION_BLOCKED_MESSAGE,
  APPROVED_AUTOMATION_CANCEL_LABEL,
  APPROVED_AUTOMATION_CANCELLED_MESSAGE,
  APPROVED_AUTOMATION_COPY_LABEL,
  APPROVED_AUTOMATION_REVIEW_DESCRIPTION,
  APPROVED_AUTOMATION_ERROR_MESSAGE,
  APPROVED_AUTOMATION_IDLE_MESSAGE,
  APPROVED_AUTOMATION_KIND_LABEL,
  APPROVED_AUTOMATION_KIND_LABELS,
  APPROVED_AUTOMATION_NO_BUNDLE_MESSAGE,
  APPROVED_AUTOMATION_REVIEW_DISCLAIMER,
  APPROVED_AUTOMATION_REVIEW_OUTPUT_LABEL,
  APPROVED_AUTOMATION_REVIEW_TITLE,
  APPROVED_AUTOMATION_RUN_LABEL,
  APPROVED_AUTOMATION_RUNNING_MESSAGE,
} from "./approved-automation-review-content";
import {
  runCareerAutomationExecute,
  type ApprovedAutomationUiState,
} from "./approved-automation-review-client";

export type ApprovedAutomationReviewProps = {
  careerBundle: CareerBundle | null;
  selectedSignalIds: string[];
  availableSignals: ProviderDerivedSignal[];
};

type AutomationPreview = {
  title: string;
  description: string;
  tool: string;
  requiredCapability: string;
  riskLevel: string;
  requiresExplicitApproval: boolean;
  inputPreview: Record<string, unknown>;
};

function buildPreview(kind: CareerAutomationKind, careerBundle: CareerBundle | null): AutomationPreview {
  const mapping = CAREER_AUTOMATION_KIND_MAP[kind];
  const definition = resolveCareerToolDefinition(mapping.tool);

  return {
    title: mapping.title,
    description: mapping.description,
    tool: mapping.tool,
    requiredCapability: mapping.requiredCapability,
    riskLevel: definition?.riskLevel ?? "derive",
    requiresExplicitApproval: definition?.requiresExplicitApproval ?? false,
    inputPreview: careerBundle
      ? buildCareerAutomationToolInput(kind, {
          careerBundle,
          selectedSignalIds: [],
        })
      : {},
  };
}

export function ApprovedAutomationReviewView({
  careerBundle,
  kind,
  preview,
  approvedOnce,
  isRunning,
  uiState,
  result,
  errorMessage,
  showOutput,
  onKindChange,
  onApproveOnce,
  onRun,
  onCancel,
  onCopy,
  onReviewOutput,
}: ApprovedAutomationReviewProps & {
  kind: CareerAutomationKind;
  preview: AutomationPreview;
  approvedOnce: boolean;
  isRunning: boolean;
  uiState: ApprovedAutomationUiState;
  result: CareerAutomationExecutionResult | null;
  errorMessage: string | null;
  showOutput: boolean;
  onKindChange: (kind: CareerAutomationKind) => void;
  onApproveOnce: () => void;
  onRun: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onReviewOutput: () => void;
}) {
  const hasBundle = careerBundle != null && careerBundle.applications.length > 0;
  const disabledByFlag =
    result?.status === "blocked" && result.warnings.some((w) => w.code === "automation_disabled");

  const statusMessage = !hasBundle
    ? APPROVED_AUTOMATION_NO_BUNDLE_MESSAGE
    : disabledByFlag
      ? APPROVED_AUTOMATION_BLOCKED_MESSAGE
      : uiState === "running"
        ? APPROVED_AUTOMATION_RUNNING_MESSAGE
        : uiState === "blocked"
          ? APPROVED_AUTOMATION_BLOCKED_MESSAGE
          : uiState === "cancelled"
            ? APPROVED_AUTOMATION_CANCELLED_MESSAGE
            : uiState === "approval_required"
              ? APPROVED_AUTOMATION_APPROVAL_REQUIRED_MESSAGE
              : APPROVED_AUTOMATION_IDLE_MESSAGE;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-emerald-500/25 bg-emerald-950/10"
      data-testid="approved-automation-review-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-emerald-100/95">{APPROVED_AUTOMATION_REVIEW_TITLE}</h3>
          <ApplyFlowBadge tone="intel">{APPROVED_AUTOMATION_BADGE_MANUAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{APPROVED_AUTOMATION_BADGE_SINGLE}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral" data-testid="approved-automation-provider-badge">
            provider: {result?.provider ?? "mock"}
          </ApplyFlowBadge>
          {result?.reviewRequired ? (
            <ApplyFlowBadge tone="warning" data-testid="approved-automation-review-badge">
              Review required
            </ApplyFlowBadge>
          ) : null}
        </div>

        <p>{APPROVED_AUTOMATION_REVIEW_DESCRIPTION}</p>
        <p data-testid="approved-automation-disclaimer">{APPROVED_AUTOMATION_REVIEW_DISCLAIMER}</p>

        <div className="space-y-2">
          <label htmlFor="approved-automation-kind-select" className="font-medium text-[color:var(--af-text)]">
            {APPROVED_AUTOMATION_KIND_LABEL}
          </label>
          <select
            id="approved-automation-kind-select"
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={kind}
            onChange={(event) => onKindChange(event.target.value as CareerAutomationKind)}
            data-testid="approved-automation-kind-select"
          >
            {(Object.keys(APPROVED_AUTOMATION_KIND_LABELS) as CareerAutomationKind[]).map((value) => (
              <option key={value} value={value}>
                {APPROVED_AUTOMATION_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1" data-testid="approved-automation-proposal">
          <p>
            Proposal: <span className="font-medium text-[color:var(--af-text)]">{preview.title}</span>
          </p>
          <p>{preview.description}</p>
          <p>
            Tool: <span className="font-medium text-[color:var(--af-text)]">{preview.tool}</span>
          </p>
          <p>
            Capability:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{preview.requiredCapability}</span>
          </p>
          <p>
            Risk: <span className="font-medium text-[color:var(--af-text)]">{preview.riskLevel}</span>
          </p>
          <p>
            Approval required:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {preview.requiresExplicitApproval ? "yes (export)" : "yes (single execution)"}
            </span>
          </p>
          <p data-testid="approved-automation-input-summary">
            Input summary:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {Object.keys(preview.inputPreview).length > 0
                ? Object.keys(preview.inputPreview).join(", ")
                : "none"}
            </span>
          </p>
          <p data-testid="approved-automation-status">
            Execution status:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{result?.status ?? uiState}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ApplyFlowButton
            type="button"
            variant="outlineBrand"
            size="sm"
            disabled={!hasBundle || approvedOnce || isRunning}
            onClick={onApproveOnce}
            data-testid="approved-automation-approve-once-button"
          >
            {APPROVED_AUTOMATION_APPROVE_ONCE_LABEL}
          </ApplyFlowButton>
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!hasBundle || !approvedOnce || isRunning}
            onClick={onRun}
            data-testid="approved-automation-run-button"
          >
            {isRunning ? "Running…" : APPROVED_AUTOMATION_RUN_LABEL}
          </ApplyFlowButton>
          <ApplyFlowButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            data-testid="approved-automation-cancel-button"
          >
            {APPROVED_AUTOMATION_CANCEL_LABEL}
          </ApplyFlowButton>
          {result?.status === "completed" ? (
            <>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onCopy}
                data-testid="approved-automation-copy-button"
              >
                {APPROVED_AUTOMATION_COPY_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onReviewOutput}
                data-testid="approved-automation-review-output-button"
              >
                {APPROVED_AUTOMATION_REVIEW_OUTPUT_LABEL}
              </ApplyFlowButton>
            </>
          ) : null}
        </div>

        {statusMessage ? (
          <p role="status" data-testid="approved-automation-status-message">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-amber-200/90" data-testid="approved-automation-error-message">
            {errorMessage}
          </p>
        ) : null}

        {result?.status === "completed" ? (
          <div className="space-y-1" data-testid="approved-automation-meta">
            <p>Kind: {result.kind}</p>
            <p>Tool: {result.toolName}</p>
            <p>Executed externally: {String(result.executedExternally)}</p>
            <p>Scheduled: {String(result.scheduled)}</p>
            <p>Background: {String(result.backgroundExecution)}</p>
            <p>Persisted: {String(result.persisted)}</p>
          </div>
        ) : null}

        {showOutput && result?.status === "completed" ? (
          <pre
            className="overflow-x-auto rounded-[var(--af-radius-sm)] bg-[color:var(--af-surface)] p-2 text-[10px] text-[color:var(--af-text)]"
            data-testid="approved-automation-output"
          >
            {JSON.stringify(result.data, null, 2)}
          </pre>
        ) : null}

        {result?.warnings.length ? (
          <div data-testid="approved-automation-warnings">
            <p className="font-medium text-[color:var(--af-text)]">Warnings</p>
            <ul className="list-inside list-disc">
              {result.warnings.map((warning, index) => (
                <li key={`warning-${index}`}>
                  {warning.code}: {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result?.trace ? (
          <div data-testid="approved-automation-trace">
            <p className="font-medium text-[color:var(--af-text)]">Execution trace</p>
            <ol className="list-inside list-decimal">
              {result.trace.steps.map((step) => (
                <li key={`${step.code}-${step.timestamp}-${step.status}`}>
                  {step.code} ({step.status}): {step.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

export function ApprovedAutomationReview({
  careerBundle,
  selectedSignalIds,
  availableSignals,
}: ApprovedAutomationReviewProps) {
  const [kind, setKind] = useState<CareerAutomationKind>("prepare_application_review");
  const [approvedOnce, setApprovedOnce] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CareerAutomationExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const runningRef = useRef(false);

  const preview = useMemo(() => buildPreview(kind, careerBundle), [kind, careerBundle]);

  const uiState: ApprovedAutomationUiState = isRunning
    ? "running"
    : result?.status === "completed"
      ? "completed"
      : result?.status === "blocked"
        ? "blocked"
        : cancelled
          ? "cancelled"
          : approvedOnce
            ? "approval_required"
            : "idle";

  async function handleRun() {
    if (!careerBundle || !approvedOnce) {
      return;
    }

    if (runningRef.current) {
      setErrorMessage(APPROVED_AUTOMATION_ALREADY_RUNNING_MESSAGE);
      return;
    }

    runningRef.current = true;
    setIsRunning(true);
    setErrorMessage(null);
    setCancelled(false);

    try {
      const nextResult = await runCareerAutomationExecute({
        kind,
        explicitApproval: true,
        approvalScope: "single_execution",
        context: {
          careerBundle,
          selectedSignalIds,
          availableSignals,
        },
      });
      setResult(nextResult);
      setApprovedOnce(false);
    } catch {
      setErrorMessage(APPROVED_AUTOMATION_ERROR_MESSAGE);
    } finally {
      runningRef.current = false;
      setIsRunning(false);
    }
  }

  return (
    <ApprovedAutomationReviewView
      careerBundle={careerBundle}
      selectedSignalIds={selectedSignalIds}
      availableSignals={availableSignals}
      kind={kind}
      preview={preview}
      approvedOnce={approvedOnce}
      isRunning={isRunning}
      uiState={uiState}
      result={result}
      errorMessage={errorMessage}
      showOutput={showOutput}
      onKindChange={(nextKind) => {
        setKind(nextKind);
        setApprovedOnce(false);
        setResult(null);
        setErrorMessage(null);
        setShowOutput(false);
        setCancelled(false);
      }}
      onApproveOnce={() => {
        setApprovedOnce(true);
        setCancelled(false);
        setErrorMessage(null);
      }}
      onRun={() => {
        void handleRun();
      }}
      onCancel={() => {
        setApprovedOnce(false);
        setResult(null);
        setErrorMessage(null);
        setShowOutput(false);
        setCancelled(true);
      }}
      onCopy={() => {
        if (result) {
          void navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        }
      }}
      onReviewOutput={() => setShowOutput(true)}
    />
  );
}
