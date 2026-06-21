"use client";

import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { CareerPilotResultModel } from "./career-pilot-result-mapper";
import {
  CAREER_PILOT_RESULT_EVIDENCE_TITLE,
  CAREER_PILOT_RESULT_FINDINGS_TITLE,
  CAREER_PILOT_RESULT_IMPROVEMENTS_TITLE,
  CAREER_PILOT_RESULT_NEXT_ACTIONS_TITLE,
  CAREER_PILOT_RESULT_RISKS_TITLE,
  CAREER_PILOT_RESULT_SCORES_TITLE,
  CAREER_PILOT_RESULT_STRENGTHS_TITLE,
  CAREER_PILOT_RESULT_SUMMARY_TITLE,
  CAREER_PILOT_RESULT_TECHNICAL_TITLE,
} from "./career-pilot-result-content";

function ResultList({
  items,
  emptyLabel,
  testId,
}: {
  items: string[];
  emptyLabel: string;
  testId: string;
}) {
  if (items.length === 0) {
    return <p className="text-[11px] text-[color:var(--af-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="list-inside list-disc space-y-1" data-testid={testId}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CareerPilotResultSummary({ summary }: { summary: string }) {
  return (
    <section aria-labelledby="career-pilot-result-summary-title" data-testid="career-pilot-result-summary">
      <h4 id="career-pilot-result-summary-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_SUMMARY_TITLE}
      </h4>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{summary}</p>
    </section>
  );
}

export function CareerPilotFindings({
  strengths,
  improvements,
}: {
  strengths: string[];
  improvements: string[];
}) {
  return (
    <section aria-labelledby="career-pilot-result-findings-title" data-testid="career-pilot-result-findings">
      <h4 id="career-pilot-result-findings-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_FINDINGS_TITLE}
      </h4>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300/90">
            {CAREER_PILOT_RESULT_STRENGTHS_TITLE}
          </p>
          <ResultList
            items={strengths}
            emptyLabel="Nenhum ponto forte destacado nesta análise."
            testId="career-pilot-result-strengths"
          />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-300/90">
            {CAREER_PILOT_RESULT_IMPROVEMENTS_TITLE}
          </p>
          <ResultList
            items={improvements}
            emptyLabel="Nenhum ponto de melhoria prioritário identificado."
            testId="career-pilot-result-improvements"
          />
        </div>
      </div>
    </section>
  );
}

export function CareerPilotNextActions({ actions }: { actions: string[] }) {
  return (
    <section aria-labelledby="career-pilot-result-actions-title" data-testid="career-pilot-result-actions">
      <h4 id="career-pilot-result-actions-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_NEXT_ACTIONS_TITLE}
      </h4>
      <ResultList
        items={actions}
        emptyLabel="Revise o resumo e os achados para definir seus próximos passos."
        testId="career-pilot-result-action-list"
      />
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
      <ResultList items={risks} emptyLabel="" testId="career-pilot-result-risk-list" />
    </section>
  );
}

export function CareerPilotScoreDetails({
  scores,
}: {
  scores: CareerPilotResultModel["scores"];
}) {
  if (scores.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="career-pilot-result-scores-title" data-testid="career-pilot-result-scores">
      <h4 id="career-pilot-result-scores-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_SCORES_TITLE}
      </h4>
      <ul className="mt-1 space-y-1">
        {scores.map((score) => (
          <li key={score.label}>
            {score.label}: {score.value}
            {score.max != null ? `/${score.max}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CareerPilotEvidenceDetails({ evidence }: { evidence: string[] }) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="career-pilot-result-evidence-title" data-testid="career-pilot-result-evidence">
      <h4 id="career-pilot-result-evidence-title" className="text-sm font-semibold text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_EVIDENCE_TITLE}
      </h4>
      <ResultList items={evidence} emptyLabel="" testId="career-pilot-result-evidence-list" />
    </section>
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
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] p-2"
      data-testid="career-pilot-result-technical"
    >
      <summary className="cursor-pointer text-sm font-medium text-[color:var(--af-text)]">
        {CAREER_PILOT_RESULT_TECHNICAL_TITLE}
      </summary>
      <div className="mt-2 space-y-2 text-[11px] text-[color:var(--af-text-muted)]">
        <ul className="list-inside list-disc space-y-1" data-testid="career-pilot-result-technical-lines">
          {technicalLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {traceSteps.length > 0 ? (
          <ol className="list-inside list-decimal space-y-1" data-testid="career-pilot-result-trace">
            {traceSteps.map((step) => (
              <li key={`${step.code}-${step.message}`}>
                {step.code}: {step.message}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </details>
  );
}

export function CareerPilotResultView({ model }: { model: CareerPilotResultModel }) {
  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="space-y-4 border border-emerald-500/20 bg-emerald-950/10"
      data-testid="career-pilot-result-view"
    >
      <h3 className="text-sm font-semibold text-emerald-100/95">{model.flowTitle}</h3>
      <CareerPilotResultSummary summary={model.summary} />
      <CareerPilotFindings strengths={model.strengths} improvements={model.improvements} />
      <CareerPilotNextActions actions={model.nextActions} />
      <CareerPilotRisks risks={model.risks} />
      <CareerPilotScoreDetails scores={model.scores} />
      <CareerPilotEvidenceDetails evidence={model.evidence} />
      <CareerPilotTechnicalDetails technicalLines={model.technicalLines} traceSteps={model.traceSteps} />
    </ApplyFlowCard>
  );
}
