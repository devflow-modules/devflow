"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  resolveCareerAgentForIntent,
  type CareerAgentIntent,
  type CareerAgentOrchestrationBody,
  type CareerAgentResult,
} from "@devflow/career-core";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "@devflow/career-core";
import { useMemo, useState } from "react";
import {
  CAREER_AGENT_WORKSPACE_AGENT_LABEL,
  CAREER_AGENT_WORKSPACE_BADGE_IN_MEMORY,
  CAREER_AGENT_WORKSPACE_BADGE_MANUAL,
  CAREER_AGENT_WORKSPACE_BADGE_READ_ONLY,
  CAREER_AGENT_WORKSPACE_BLOCKED_MESSAGE,
  CAREER_AGENT_WORKSPACE_CONSENT_LABEL,
  CAREER_AGENT_WORKSPACE_DESCRIPTION,
  CAREER_AGENT_WORKSPACE_DISCLAIMER,
  CAREER_AGENT_WORKSPACE_IDLE_MESSAGE,
  CAREER_AGENT_WORKSPACE_INTENT_LABEL,
  CAREER_AGENT_WORKSPACE_INTENT_LABELS,
  CAREER_AGENT_WORKSPACE_NO_BUNDLE_MESSAGE,
  CAREER_AGENT_WORKSPACE_RUN_LABEL,
  CAREER_AGENT_WORKSPACE_TITLE,
} from "./career-agent-workspace-content";
import {
  runCareerAgentOrchestration,
  type CareerAgentWorkspaceUiState,
} from "./career-agent-workspace-client";
import { CareerToolPermissionReview } from "./career-tool-permission-review";
import { deriveCareerAgentRequestId } from "@devflow/career-core";

export type CareerAgentWorkspaceProps = {
  careerBundle: CareerBundle | null;
  selectedSignalIds: string[];
  availableSignals: ProviderDerivedSignal[];
};

function resolveUiState(input: {
  hasBundle: boolean;
  explicitConsent: boolean;
  isRunning: boolean;
  result: CareerAgentResult | null;
  errorMessage: string | null;
}): CareerAgentWorkspaceUiState {
  if (input.isRunning) {
    return "running";
  }

  if (input.errorMessage) {
    return "error";
  }

  if (input.result?.status === "completed") {
    return "completed";
  }

  if (input.result?.status === "blocked") {
    return "blocked";
  }

  if (!input.hasBundle) {
    return "blocked";
  }

  if (!input.explicitConsent) {
    return "idle";
  }

  return input.result ? "ready" : "ready";
}

export function CareerAgentWorkspaceView({
  careerBundle,
  selectedSignalIds,
  availableSignals,
  intent,
  explicitConsent,
  uiState,
  result,
  errorMessage,
  onIntentChange,
  onConsentChange,
  onRunAnalysis,
  isRunning,
}: CareerAgentWorkspaceProps & {
  intent: CareerAgentIntent;
  explicitConsent: boolean;
  uiState: CareerAgentWorkspaceUiState;
  result: CareerAgentResult | null;
  errorMessage: string | null;
  onIntentChange: (intent: CareerAgentIntent) => void;
  onConsentChange: (checked: boolean) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
}) {
  const recommendedAgent = resolveCareerAgentForIntent(intent);
  const emptyMessage = !careerBundle
    ? CAREER_AGENT_WORKSPACE_NO_BUNDLE_MESSAGE
    : uiState === "blocked"
      ? CAREER_AGENT_WORKSPACE_BLOCKED_MESSAGE
      : uiState === "idle"
        ? CAREER_AGENT_WORKSPACE_IDLE_MESSAGE
        : null;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-emerald-500/25 bg-emerald-950/10"
      data-testid="career-agent-workspace-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-emerald-100/95">{CAREER_AGENT_WORKSPACE_TITLE}</h3>
          <ApplyFlowBadge tone="neutral">{CAREER_AGENT_WORKSPACE_BADGE_READ_ONLY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{CAREER_AGENT_WORKSPACE_BADGE_MANUAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{CAREER_AGENT_WORKSPACE_BADGE_IN_MEMORY}</ApplyFlowBadge>
        </div>

        <p>{CAREER_AGENT_WORKSPACE_DESCRIPTION}</p>
        <p data-testid="career-agent-workspace-disclaimer">{CAREER_AGENT_WORKSPACE_DISCLAIMER}</p>

        <div className="space-y-2">
          <label htmlFor="career-agent-intent-select" className="font-medium text-[color:var(--af-text)]">
            {CAREER_AGENT_WORKSPACE_INTENT_LABEL}
          </label>
          <select
            id="career-agent-intent-select"
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={intent}
            onChange={(event) => onIntentChange(event.target.value as CareerAgentIntent)}
            data-testid="career-agent-intent-select"
          >
            {(Object.keys(CAREER_AGENT_WORKSPACE_INTENT_LABELS) as CareerAgentIntent[]).map((value) => (
              <option key={value} value={value}>
                {CAREER_AGENT_WORKSPACE_INTENT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <p data-testid="career-agent-recommended-agent">
          {CAREER_AGENT_WORKSPACE_AGENT_LABEL}:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{recommendedAgent ?? "—"}</span>
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div data-testid="career-agent-available-inputs">
            <p className="font-medium text-[color:var(--af-text)]">Available inputs</p>
            <ul className="list-inside list-disc">
              <li>CareerBundle applications: {careerBundle?.applications.length ?? 0}</li>
              <li>Selected signals: {selectedSignalIds.length}</li>
              <li>Available signals: {availableSignals.length}</li>
            </ul>
          </div>
          <div data-testid="career-agent-missing-inputs">
            <p className="font-medium text-[color:var(--af-text)]">Missing inputs</p>
            <ul className="list-inside list-disc">
              {!careerBundle ? <li>careerBundle</li> : null}
              {careerBundle && careerBundle.applications.length === 0 ? <li>applications</li> : null}
              {!explicitConsent ? <li>explicitConsent</li> : null}
              {careerBundle && explicitConsent ? <li>none</li> : null}
            </ul>
          </div>
        </div>

        {result?.executionPlan ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div data-testid="career-agent-allowed-capabilities">
              <p className="font-medium text-[color:var(--af-text)]">Allowed capabilities</p>
              <ul className="list-inside list-disc">
                {result.executionPlan.allowedCapabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
            <div data-testid="career-agent-blocked-capabilities">
              <p className="font-medium text-[color:var(--af-text)]">Blocked capabilities</p>
              <ul className="list-inside list-disc">
                {result.executionPlan.blockedCapabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={explicitConsent}
            onChange={(event) => onConsentChange(event.target.checked)}
            data-testid="career-agent-consent-checkbox"
          />
          <span>{CAREER_AGENT_WORKSPACE_CONSENT_LABEL}</span>
        </label>

        <ApplyFlowButton
          type="button"
          variant="primary"
          size="sm"
          disabled={!careerBundle || !explicitConsent || isRunning}
          onClick={onRunAnalysis}
          data-testid="career-agent-run-button"
        >
          {isRunning ? "Running…" : CAREER_AGENT_WORKSPACE_RUN_LABEL}
        </ApplyFlowButton>

        {emptyMessage ? (
          <p role="status" data-testid="career-agent-empty-message">
            {emptyMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-amber-200/90" data-testid="career-agent-error-message">
            {errorMessage}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-3" data-testid="career-agent-result">
            <p className="font-medium text-[color:var(--af-text)]">Structured result</p>
            <p>Status: {result.status}</p>
            <p>Agent: {result.agent}</p>
            <p>Summary: {result.summary}</p>
            {result.findings.length > 0 ? (
              <ul className="list-inside list-disc">
                {result.findings.map((finding) => (
                  <li key={`${finding.title}-${finding.category}`}>{finding.title}</li>
                ))}
              </ul>
            ) : null}
            {result.interviewPreparationProposal ? (
              <div data-testid="career-agent-handoff-preview">
                <p className="font-medium text-[color:var(--af-text)]">Interview Lab handoff preview</p>
                <p>Focus areas: {result.interviewPreparationProposal.focusAreas.join(", ") || "—"}</p>
                <ApplyFlowButton
                  type="button"
                  variant="outlineBrand"
                  size="sm"
                  data-testid="career-agent-copy-handoff-button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(result.interviewPreparationProposal, null, 2),
                    );
                  }}
                >
                  Copy handoff preview
                </ApplyFlowButton>
              </div>
            ) : null}
          </div>
        ) : null}

        {result?.trace ? (
          <div data-testid="career-agent-trace">
            <p className="font-medium text-[color:var(--af-text)]">Execution trace</p>
            <ol className="list-inside list-decimal">
              {result.trace.steps.map((step) => (
                <li key={`${step.code}-${step.timestamp}`}>
                  {step.code}: {step.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

export function CareerAgentWorkspace({
  careerBundle,
  selectedSignalIds,
  availableSignals,
}: CareerAgentWorkspaceProps) {
  const [intent, setIntent] = useState<CareerAgentIntent>("analyze_application_fit");
  const [explicitConsent, setExplicitConsent] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CareerAgentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uiState = useMemo(
    () =>
      resolveUiState({
        hasBundle: careerBundle != null && careerBundle.applications.length > 0,
        explicitConsent,
        isRunning,
        result,
        errorMessage,
      }),
    [careerBundle, explicitConsent, errorMessage, isRunning, result],
  );

  async function handleRunAnalysis() {
    if (!careerBundle || !explicitConsent) {
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);

    const body: CareerAgentOrchestrationBody = {
      intent,
      explicitConsent: true,
      context: {
        careerBundle,
        selectedSignalIds,
        availableSignals,
      },
    };

    try {
      const nextResult = await runCareerAgentOrchestration(body);
      setResult(nextResult);
    } catch {
      setErrorMessage("Agent orchestration failed safely.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <CareerAgentWorkspaceView
        careerBundle={careerBundle}
        selectedSignalIds={selectedSignalIds}
        availableSignals={availableSignals}
        intent={intent}
        explicitConsent={explicitConsent}
        uiState={uiState}
        result={result}
        errorMessage={errorMessage}
        onIntentChange={setIntent}
        onConsentChange={setExplicitConsent}
        onRunAnalysis={() => {
          void handleRunAnalysis();
        }}
        isRunning={isRunning}
      />

      {result?.status === "completed" && careerBundle ? (
        <CareerToolPermissionReview
          agentResult={result}
          orchestration={{
            intent,
            explicitConsent: true,
            context: {
              careerBundle,
              selectedSignalIds,
              availableSignals,
            },
          }}
          agentRequestId={deriveCareerAgentRequestId({
            intent,
            careerBundle,
            selectedSignalIds,
          })}
        />
      ) : null}
    </>
  );
}
