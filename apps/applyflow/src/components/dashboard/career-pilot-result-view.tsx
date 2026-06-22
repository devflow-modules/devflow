"use client";

import type { CareerChatIntent } from "@devflow/career-core";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { CareerPilotResultModel } from "./career-pilot-result-mapper";
import {
  CAREER_PILOT_RESULT_EVIDENCE_TITLE,
  CAREER_PILOT_RESULT_NEXT_ACTIONS_TITLE,
  CAREER_PILOT_RESULT_RISKS_TITLE,
  CAREER_PILOT_RESULT_SUMMARY_TITLE,
  CAREER_PILOT_RESULT_TECHNICAL_TITLE,
} from "./career-pilot-result-content";
import { CareerActionList } from "./career-action-list";
import { CareerFindingGroup } from "./career-finding-group";
import { careerPolishMotion } from "./career-polish-classes";
import { CareerResultHeader } from "./career-result-header";
import { CareerScoreIndicator } from "./career-score-indicator";
import { isCareerPilotIntent } from "./career-pilot-content";
import { careerPilotCompletionMessage } from "./career-result-header";

function ResultBulletList({
  items,
  testId,
}: {
  items: string[];
  testId: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]" data-testid={testId}>
      {items.map((item) => (
        <li
          key={item}
          className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)] px-3 py-2"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CareerPilotResultSummary({ summary }: { summary: string }) {
  return (
    <section
      aria-labelledby="career-pilot-result-summary-title"
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-4"
      data-testid="career-pilot-result-summary"
    >
      <h4 id="career-pilot-result-summary-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_SUMMARY_TITLE}
      </h4>
      <p className="mt-2 text-base leading-relaxed text-[color:var(--af-text)]">{summary}</p>
    </section>
  );
}

export function CareerPilotNextActions({ actions }: { actions: string[] }) {
  return (
    <section aria-labelledby="career-pilot-result-actions-title" data-testid="career-pilot-result-actions">
      <h4 id="career-pilot-result-actions-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_NEXT_ACTIONS_TITLE}
      </h4>
      <div className="mt-3">
        <CareerActionList actions={actions} />
      </div>
    </section>
  );
}

export function CareerPilotRisks({ risks }: { risks: string[] }) {
  if (risks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="career-pilot-result-risks-title" data-testid="career-pilot-result-risks">
      <h4 id="career-pilot-result-risks-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_RISKS_TITLE}
      </h4>
      <div className="mt-2">
        <ResultBulletList items={risks} testId="career-pilot-result-risk-list" />
      </div>
    </section>
  );
}

export function CareerPilotScoreDetails({
  scores,
  hidePrimary,
}: {
  scores: CareerPilotResultModel["scores"];
  hidePrimary?: boolean;
}) {
  const visibleScores = hidePrimary && scores.length > 0 ? scores.slice(1) : scores;
  if (visibleScores.length === 0 || (hidePrimary && scores.length <= 1)) {
    return null;
  }

  return (
    <section aria-labelledby="career-pilot-result-scores-title" data-testid="career-pilot-result-scores">
      {visibleScores.length > 1 || !hidePrimary ? (
        <h4 id="career-pilot-result-scores-title" className="text-sm font-semibold text-[color:var(--af-text)]">
          Indicadores
        </h4>
      ) : null}
      <div className="mt-3 space-y-3">
        {visibleScores.map((score) => (
          <CareerScoreIndicator key={score.label} score={score} />
        ))}
      </div>
    </section>
  );
}

export function CareerPilotEvidenceDetails({ evidence }: { evidence: string[] }) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <details
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)]"
      data-testid="career-pilot-result-evidence"
    >
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-[color:var(--af-text)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {CAREER_PILOT_RESULT_EVIDENCE_TITLE}
          <span aria-hidden className="text-[color:var(--af-text-muted)]">
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-[color:var(--af-border)] px-3 py-3">
        <ResultBulletList items={evidence} testId="career-pilot-result-evidence-list" />
      </div>
    </details>
  );
}

export function CareerPilotTechnicalDetails({
  technicalLines,
  traceSteps,
}: {
  technicalLines: string[];
  traceSteps: CareerPilotResultModel["traceSteps"];
}) {
  return (
    <details
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)]"
      data-testid="career-pilot-result-technical"
    >
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-[color:var(--af-text)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {CAREER_PILOT_RESULT_TECHNICAL_TITLE}
          <span aria-hidden className="text-[color:var(--af-text-muted)]">
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-[color:var(--af-border)] px-3 py-3 text-[13px] leading-relaxed text-[color:var(--af-text-muted)]">
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="career-pilot-result-technical-lines">
          {technicalLines.map((line) => (
            <li key={line} className="rounded-[var(--af-radius-sm)] bg-[color:var(--af-surface)] px-2 py-1.5">
              {line}
            </li>
          ))}
        </ul>
        {traceSteps.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
              Trace
            </p>
            <ol className="space-y-1 font-mono text-xs" data-testid="career-pilot-result-trace">
              {traceSteps.map((step) => (
                <li key={`${step.code}-${step.message}`}>
                  {step.code}: {step.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function CareerPilotResultView({
  model,
  intent,
}: {
  model: CareerPilotResultModel;
  intent?: CareerChatIntent;
}) {
  const resolvedIntent = intent && isCareerPilotIntent(intent) ? intent : undefined;
  const primaryScore = model.scores[0];
  const completionMessage = resolvedIntent
    ? careerPilotCompletionMessage(resolvedIntent, model.flowTitle)
    : `${model.flowTitle} concluída`;

  return (
    <ApplyFlowCard
      variant="default"
      padding="md"
      className={`max-w-3xl space-y-5 border border-[color:var(--af-border)] bg-[color:var(--af-surface)] ${careerPolishMotion}`}
      data-testid="career-pilot-result-view"
    >
      <CareerResultHeader
        flowTitle={model.flowTitle}
        completionMessage={completionMessage}
        primaryScore={primaryScore}
      />
      <CareerPilotResultSummary summary={model.summary} />
      <CareerPilotScoreDetails scores={model.scores} hidePrimary={Boolean(primaryScore)} />
      <CareerFindingGroup strengths={model.strengths} improvements={model.improvements} />
      <CareerPilotNextActions actions={model.nextActions} />
      <CareerPilotRisks risks={model.risks} />
      <CareerPilotEvidenceDetails evidence={model.evidence} />
      <CareerPilotTechnicalDetails technicalLines={model.technicalLines} traceSteps={model.traceSteps} />
    </ApplyFlowCard>
  );
}

// Re-exports for tests
export { CareerFindingGroup as CareerPilotFindings };
