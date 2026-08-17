"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  CURRICULUM_ROUTER_COMPARE_LABEL,
  CURRICULUM_ROUTER_EQUIVALENT_HINT,
  CURRICULUM_ROUTER_NOT_AN_ACTION,
  CURRICULUM_ROUTER_SKIP_HINT,
  JOB_INBOX_COMPANY_LABEL,
  JOB_INBOX_DESCRIPTION,
  JOB_INBOX_EVALUATED_WITH_PREFIX,
  JOB_INBOX_EYEBROW,
  JOB_INBOX_MATCHED_WITH_PREFIX,
  JOB_INBOX_PASTE_LABEL,
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_INBOX_TITLE_LABEL,
  JOB_INBOX_URL_LABEL,
  JOB_MATCH_DECISION_LABELS,
  curriculumRouterAdvantageLabel,
  curriculumRouterDivergenceLabel,
  curriculumRouterHeading,
  jobMatchDecisionTone,
} from "@/components/dashboard/job-inbox-content";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  type ApplyFlowJob,
  type CurriculumRecommendation,
} from "@devflow/applyflow-core";
import { useState } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

function JobMatchSkillLine({ job }: { job: ApplyFlowJob }) {
  return (
    <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
      Match: {job.jobMatch.matchedSkills.slice(0, 8).join(", ") || "—"}
      {job.jobMatch.missingSkills.length > 0
        ? ` · Gaps: ${job.jobMatch.missingSkills.slice(0, 6).join(", ")}`
        : ""}
    </p>
  );
}

function CurriculumCompareList({ recommendation }: { recommendation: CurriculumRecommendation }) {
  return (
    <ul className="mt-2 grid gap-1.5">
      {recommendation.candidates.map((candidate) => (
        <li
          key={candidate.variantId}
          className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[color:var(--af-text)]"
        >
          <span>{candidate.variantName}</span>
          <span className="tabular-nums text-[color:var(--af-text-muted)]">
            {candidate.score}/100 {JOB_MATCH_DECISION_LABELS[candidate.decision]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CurriculumRouterBlock({
  job,
  recommendation,
}: {
  job: ApplyFlowJob;
  recommendation: CurriculumRecommendation;
}) {
  const skip = job.jobMatch.decision === "skip";
  const recommended = recommendation.candidates.find(
    (candidate) => candidate.variantId === recommendation.recommendedVariantId,
  );
  const runnerUp = recommendation.candidates.find(
    (candidate) => candidate.variantId === recommendation.runnerUpVariantId,
  );
  const advantage = curriculumRouterAdvantageLabel(recommendation);
  const divergence = job.evaluatedWith
    ? curriculumRouterDivergenceLabel({
        evaluatedWithName: job.evaluatedWith.variantName,
        evaluatedWithId: job.evaluatedWith.variantId,
        recommendation,
      })
    : null;

  const comparison = (
    <details className="mt-3">
      <summary
        className={cn(
          "cursor-pointer text-xs font-medium text-[color:var(--af-text)]",
          "rounded-[var(--af-radius-sm)] focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
        )}
      >
        {CURRICULUM_ROUTER_COMPARE_LABEL}
      </summary>
      {skip ? <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{CURRICULUM_ROUTER_SKIP_HINT}</p> : null}
      {divergence && skip ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{divergence}</p>
      ) : null}
      <CurriculumCompareList recommendation={recommendation} />
    </details>
  );

  if (skip) return comparison;

  return (
    <div className="mt-3 border-t border-[color:var(--af-border)] pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
        {curriculumRouterHeading(recommendation)}
      </p>
      {recommendation.confidence === "equivalent" && recommended && runnerUp ? (
        <div className="mt-1.5 grid gap-1 text-sm text-[color:var(--af-text)]">
          <p>
            {recommended.variantName} — {recommended.score}
          </p>
          <p>
            {runnerUp.variantName} — {runnerUp.score}
          </p>
          <p className="text-xs text-[color:var(--af-text-muted)]">{CURRICULUM_ROUTER_EQUIVALENT_HINT}</p>
        </div>
      ) : (
        <div className="mt-1.5">
          <p className="text-sm font-medium text-[color:var(--af-text)]">{recommendation.recommendedVariantName}</p>
          <p className="tabular-nums text-sm text-[color:var(--af-text-muted)]">{recommended?.score ?? 0}/100</p>
          {advantage ? <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{advantage}</p> : null}
        </div>
      )}
      {recommended && recommended.matchedSkills.length + recommended.missingSkills.length > 0 ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
          Por quê: {recommended.matchedSkills.slice(0, 6).map((skill) => `✓ ${skill}`).join(" ")}
          {recommended.missingSkills.length > 0
            ? ` ${recommended.missingSkills.slice(0, 4).map((skill) => `△ ${skill} não encontrado`).join(" ")}`
            : ""}
        </p>
      ) : null}
      {divergence ? <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{divergence}</p> : null}
      <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{CURRICULUM_ROUTER_NOT_AN_ACTION}</p>
      {comparison}
    </div>
  );
}

function JobInboxCard({ job }: { job: ApplyFlowJob }) {
  return (
    <ApplyFlowCard padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <ApplyFlowBadge tone={jobMatchDecisionTone(job.jobMatch.decision)}>
          {JOB_MATCH_DECISION_LABELS[job.jobMatch.decision]}
        </ApplyFlowBadge>
        <ApplyFlowBadge tone="neutral">{APPLYFLOW_APPLICATION_STATUS_LABELS_PT[job.status]}</ApplyFlowBadge>
        <span className="text-sm font-medium text-[color:var(--af-text)]">
          {job.title}
          {job.company ? ` · ${job.company}` : ""}
        </span>
        <span className="ml-auto tabular-nums text-sm text-[color:var(--af-text-muted)]">
          {job.jobMatch.score}/100
        </span>
      </div>
      {job.evaluatedWith ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
          {JOB_INBOX_MATCHED_WITH_PREFIX} {job.evaluatedWith.variantName}
        </p>
      ) : null}
      <JobMatchSkillLine job={job} />
      {job.curriculumRecommendation ? (
        <CurriculumRouterBlock job={job} recommendation={job.curriculumRecommendation} />
      ) : null}
    </ApplyFlowCard>
  );
}

export function JobInboxPanel({
  jobs,
  error,
  evaluatedWithName,
  onEvaluatePaste,
}: {
  jobs: ApplyFlowJob[];
  error: string | null;
  evaluatedWithName: string;
  onEvaluatePaste: (input: { description: string; title: string; company: string; url: string }) => void;
}) {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");

  return (
    <ApplyFlowSection
      id="job-inbox"
      eyebrow={JOB_INBOX_EYEBROW}
      title={JOB_INBOX_TITLE}
      description={JOB_INBOX_DESCRIPTION}
    >
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onEvaluatePaste({ description, title, company, url });
        }}
      >
        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          {JOB_INBOX_PASTE_LABEL}
          <textarea
            required
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={fieldClass}
            placeholder="Cola a descrição da vaga. Não precisas de URL fetch — o texto basta."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_INBOX_TITLE_LABEL}
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_INBOX_COMPANY_LABEL}
            <input value={company} onChange={(event) => setCompany(event.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            {JOB_INBOX_URL_LABEL}
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={fieldClass}
              inputMode="url"
              autoComplete="off"
            />
          </label>
        </div>
        <div>
          <ApplyFlowButton type="submit" variant="primary" size="md">
            {JOB_INBOX_SUBMIT_LABEL}
          </ApplyFlowButton>
          <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
            {JOB_INBOX_EVALUATED_WITH_PREFIX} {evaluatedWithName}
          </p>
        </div>
      </form>

      {error ? (
        <ApplyFlowCard variant="danger" padding="md" role="alert" className="mt-4">
          <p className="text-sm text-red-100/90">{error}</p>
        </ApplyFlowCard>
      ) : null}

      {jobs.length > 0 ? (
        <ul className="mt-5 grid gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobInboxCard job={job} />
            </li>
          ))}
        </ul>
      ) : null}
    </ApplyFlowSection>
  );
}
