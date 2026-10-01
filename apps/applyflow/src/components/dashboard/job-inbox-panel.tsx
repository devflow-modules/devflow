"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  APPLICATION_PACK_ANSWER_LABELS,
  APPLICATION_PACK_ANSWERS_HINT,
  APPLICATION_PACK_ANSWERS_LABEL,
  APPLICATION_PACK_CHECKLIST_LABEL,
  APPLICATION_PACK_CHECKLIST_LABELS,
  APPLICATION_PACK_FACTS_LABEL,
  APPLICATION_PACK_FIT_LABEL,
  APPLICATION_PACK_GAPS_LABEL,
  APPLICATION_PACK_HIGHLIGHTS_LABEL,
  APPLICATION_PACK_HINT,
  APPLICATION_PACK_MARK_APPLIED_LABEL,
  APPLICATION_PACK_OPEN_JOB_LABEL,
  APPLICATION_PACK_OPEN_LABEL,
  APPLICATION_PACK_PREPARE_LABEL,
  APPLICATION_PACK_RESUME_LABEL,
  APPLICATION_PACK_ROUTER_HINT,
  APPLICATION_PACK_SALARY_LABELS,
  APPLICATION_PACK_SELECT_LABEL,
  APPLICATION_PACK_TITLE,
  CURRICULUM_ROUTER_COMPARE_LABEL,
  CURRICULUM_ROUTER_EQUIVALENT_HINT,
  CURRICULUM_ROUTER_NOT_AN_ACTION,
  CURRICULUM_ROUTER_SKIP_HINT,
  JOB_DISCOVERY_PASTE_HEADING,
  JOB_DISCOVERY_SOURCE_REMOTEOK,
  JOB_DISCOVERY_VIEW_LISTING_REMOTEOK,
  JOB_INBOX_COMPANY_LABEL,
  JOB_INBOX_DESCRIPTION,
  JOB_INBOX_EVALUATED_WITH_PREFIX,
  JOB_DECISION_V2_LINK,
  JOB_INBOX_MATCHED_WITH_PREFIX,
  JOB_INBOX_NEEDS_RESUME,
  JOB_INBOX_PASTE_LABEL,
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_INBOX_TITLE_LABEL,
  JOB_INBOX_URL_LABEL,
  JOB_INBOX_DUPLICATE_URL,
  JOB_INBOX_OPEN_EXISTING,
  JOB_INBOX_STALE_LABEL,
  JOB_INBOX_REEVALUATE_LABEL,
  JOB_INBOX_INCOMPLETE_HINT,
  JOB_INBOX_AT_APPLY_ANALYSIS,
  JOB_INBOX_CURRENT_ANALYSIS,
  JOB_MATCH_DECISION_LABELS,
  JOB_QUEUE_EMPTY_ACTIVE,
  JOB_QUEUE_EMPTY_FILTERED,
  JOB_QUEUE_EMPTY_IGNORED,
  JOB_QUEUE_FILTER_ALL,
  JOB_QUEUE_FILTER_DECISION,
  JOB_QUEUE_FILTER_SOURCE,
  JOB_QUEUE_HISTORICAL_NOTE,
  JOB_QUEUE_IGNORE_LABEL,
  JOB_QUEUE_OPEN_SOURCE_LABEL,
  JOB_QUEUE_RESTORE_LABEL,
  JOB_QUEUE_SORT_LABEL,
  JOB_QUEUE_SORT_MATCH,
  JOB_QUEUE_SORT_RECENCY,
  JOB_QUEUE_SOURCE_LABELS,
  JOB_QUEUE_VIEW_ACTIVE,
  JOB_QUEUE_VIEW_ALL,
  JOB_QUEUE_VIEW_IGNORED,
  JOB_QUEUE_VIEW_LABEL,
  curriculumRouterAdvantageLabel,
  curriculumRouterDivergenceLabel,
  curriculumRouterHeading,
  jobMatchDecisionTone,
} from "@/components/dashboard/job-inbox-content";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  APPLYFLOW_JOB_SOURCES,
  analysisAtApplyFromOutcome,
  canCreateApplicationPack,
  countOpportunityQueueViews,
  findApplicationForJob,
  getDefaultResumeVariant,
  isJobMatchStale,
  JOB_MATCH_DECISIONS,
  presentInboxJobAnalysis,
  findJobByCanonicalUrl,
  isOpenableJobUrl,
  resolveApplicationPackResume,
  selectOpportunityQueueJobs,
  type ApplicationPack,
  type ApplicationPackChecklistId,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type ApplyFlowJobSource,
  type CurriculumRecommendation,
  type JobMatchDecision,
  type OpportunityQueueSort,
  type OpportunityQueueView,
  type ResumeLibrary,
} from "@devflow/applyflow-core";
import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { JOB_DECISION_V2_LABELS } from "@/components/dashboard/job-decision-v2-content";
import { loadDashboardAnalytics } from "@/lib/local-analytics-storage";
import { loadDashboardImport } from "@/lib/local-import-storage";
import {
  jobAnalysisPath,
  nextInboxDraftAfterEvaluate,
  type InboxEvaluateStatus,
} from "@/components/dashboard/job-inbox-evaluate";
import { JobDiscoveryPanel } from "@/components/dashboard/job-discovery-panel";
import type { DiscoveredJobSaveStatus, JobSearchHit } from "@/lib/job-sources/types";

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
      {job.jobMatch.unknownSkills && job.jobMatch.unknownSkills.length > 0
        ? ` · Não informado: ${job.jobMatch.unknownSkills.slice(0, 6).join(", ")}`
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

function ApplicationPackFacts({ pack }: { pack: ApplicationPack }) {
  const facts = pack.candidateFacts;
  const rows: string[] = [];
  if (facts.name) rows.push(facts.name);
  if (facts.location) rows.push(facts.location);
  if (facts.englishLevel) rows.push(`Inglês: ${facts.englishLevel}`);
  if (typeof facts.comfortableInEnglish === "boolean") {
    rows.push(`Confortável em inglês: ${facts.comfortableInEnglish ? "sim" : "não"}`);
  }
  if (facts.roles && facts.roles.length > 0) rows.push(facts.roles.join(", "));
  if (facts.salary) {
    (Object.keys(APPLICATION_PACK_SALARY_LABELS) as Array<keyof typeof APPLICATION_PACK_SALARY_LABELS>).forEach(
      (key) => {
        const value = facts.salary?.[key]?.trim();
        if (value) rows.push(`${APPLICATION_PACK_SALARY_LABELS[key]}: ${value}`);
      },
    );
  }
  const answers = facts.answerBank
    ? (Object.keys(APPLICATION_PACK_ANSWER_LABELS) as Array<keyof typeof APPLICATION_PACK_ANSWER_LABELS>)
        .map((key) => {
          const value = facts.answerBank?.[key]?.trim();
          return value ? { key, value } : null;
        })
        .filter((item): item is { key: keyof typeof APPLICATION_PACK_ANSWER_LABELS; value: string } => item !== null)
    : [];

  if (rows.length === 0 && answers.length === 0) return null;

  return (
    <div className="mt-3">
      {rows.length > 0 ? (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {APPLICATION_PACK_FACTS_LABEL}
          </p>
          <ul className="mt-1.5 grid gap-1 text-xs text-[color:var(--af-text)]">
            {rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </>
      ) : null}
      {answers.length > 0 ? (
        <div className={rows.length > 0 ? "mt-3" : undefined}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {APPLICATION_PACK_ANSWERS_LABEL}
          </p>
          <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{APPLICATION_PACK_ANSWERS_HINT}</p>
          <dl className="mt-1.5 grid gap-2">
            {answers.map((item) => (
              <div key={item.key}>
                <dt className="text-xs font-medium text-[color:var(--af-text)]">
                  {APPLICATION_PACK_ANSWER_LABELS[item.key]}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-xs text-[color:var(--af-text-muted)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function ApplicationPackView({
  job,
  onTogglePackChecklist,
  onMarkJobApplied,
}: {
  job: ApplyFlowJob;
  onTogglePackChecklist?: (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => void;
  onMarkJobApplied?: (jobId: string) => void;
}) {
  const pack = job.applicationPack;
  if (!pack) return null;
  const openable = isOpenableJobUrl(job.url);

  return (
    <details className="mt-3 border-t border-[color:var(--af-border)] pt-3">
      <summary
        className={cn(
          "cursor-pointer text-sm font-medium text-[color:var(--af-text)]",
          "rounded-[var(--af-radius-sm)] focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
        )}
      >
        {APPLICATION_PACK_OPEN_LABEL}
      </summary>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
          {APPLICATION_PACK_TITLE}
        </p>
        <p className="mt-1 text-sm font-medium text-[color:var(--af-text)]">
          {job.title}
          {job.company ? ` · ${job.company}` : ""}
        </p>
        {job.location ? <p className="text-xs text-[color:var(--af-text-muted)]">{job.location}</p> : null}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
          {APPLICATION_PACK_RESUME_LABEL}
        </p>
        <p className="mt-1 text-sm text-[color:var(--af-text)]">{pack.resume.variantName}</p>
        {pack.resume.recommendedByRouter ? (
          <p className="text-xs text-[color:var(--af-text-muted)]">{APPLICATION_PACK_ROUTER_HINT}</p>
        ) : null}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
          {APPLICATION_PACK_FIT_LABEL}
        </p>
        <p className="mt-1 tabular-nums text-sm text-[color:var(--af-text)]">
          {JOB_MATCH_DECISION_LABELS[pack.match.decision]} · {pack.match.score}/100
        </p>
        {pack.highlights.length > 0 ? (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
              {APPLICATION_PACK_HIGHLIGHTS_LABEL}
            </p>
            <ul className="mt-1.5 grid gap-1 text-xs text-[color:var(--af-text)]">
              {pack.highlights.map((skill) => (
                <li key={skill}>✓ {skill}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {pack.gaps.length > 0 ? (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
              {APPLICATION_PACK_GAPS_LABEL}
            </p>
            <ul className="mt-1.5 grid gap-1 text-xs text-[color:var(--af-text)]">
              {pack.gaps.map((skill) => (
                <li key={skill}>△ {skill}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ApplicationPackFacts pack={pack} />
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {APPLICATION_PACK_CHECKLIST_LABEL}
          </p>
          <ul className="mt-1.5 grid gap-1.5">
            {pack.checklist.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-2 text-xs text-[color:var(--af-text)]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={item.done}
                    disabled={!onTogglePackChecklist}
                    onChange={(event) => onTogglePackChecklist?.(job.id, item.id, event.target.checked)}
                  />
                  {APPLICATION_PACK_CHECKLIST_LABELS[item.id]}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">{APPLICATION_PACK_HINT}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {openable && job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
            >
              {APPLICATION_PACK_OPEN_JOB_LABEL}
            </a>
          ) : null}
          {job.status !== "applied" && onMarkJobApplied ? (
            <ApplyFlowButton variant="outlineBrand" size="sm" onClick={() => onMarkJobApplied(job.id)}>
              {APPLICATION_PACK_MARK_APPLIED_LABEL}
            </ApplyFlowButton>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function ApplicationPackPrepare({
  job,
  resumeLibrary,
  onCreateApplicationPack,
}: {
  job: ApplyFlowJob;
  resumeLibrary: ResumeLibrary;
  onCreateApplicationPack: (jobId: string, variantId?: string) => void;
}) {
  const fallbackId = resumeLibrary.variants[0]?.id ?? "";
  let preselected = fallbackId;
  try {
    preselected = resolveApplicationPackResume(job, resumeLibrary).variant.id;
  } catch {
    preselected = fallbackId;
  }
  const [variantId, setVariantId] = useState(preselected);
  if (!preselected) return null;
  const selected = resumeLibrary.variants.find((variant) => variant.id === variantId);
  const recommended = selected && job.curriculumRecommendation?.recommendedVariantId === selected.id;

  return (
    <div className="mt-3 border-t border-[color:var(--af-border)] pt-3">
      {resumeLibrary.variants.length > 1 ? (
        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          {APPLICATION_PACK_SELECT_LABEL}
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className={fieldClass}
          >
            {resumeLibrary.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
                {job.curriculumRecommendation?.recommendedVariantId === variant.id
                  ? ` · ${APPLICATION_PACK_ROUTER_HINT}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-[color:var(--af-text-muted)]">
          {APPLICATION_PACK_RESUME_LABEL}: {selected?.name ?? resumeLibrary.variants[0]?.name}
        </p>
      )}
      {recommended ? <p className="mt-1.5 text-xs text-[color:var(--af-text-muted)]">{APPLICATION_PACK_ROUTER_HINT}</p> : null}
      <div className="mt-3">
        <ApplyFlowButton
          variant="secondary"
          size="sm"
          onClick={() => onCreateApplicationPack(job.id, resumeLibrary.variants.length > 1 ? variantId : undefined)}
        >
          {APPLICATION_PACK_PREPARE_LABEL}
        </ApplyFlowButton>
      </div>
    </div>
  );
}

function JobInboxCard({
  job,
  applications,
  resumeLibrary,
  onCreateApplicationPack,
  onTogglePackChecklist,
  onMarkJobApplied,
  onReevaluateJob,
  onIgnoreJob,
  onRestoreJob,
}: {
  job: ApplyFlowJob;
  applications?: readonly ApplyFlowApplicationV2Envelope[];
  resumeLibrary?: ResumeLibrary | null;
  onCreateApplicationPack?: (jobId: string, variantId?: string) => void;
  onTogglePackChecklist?: (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => void;
  onMarkJobApplied?: (jobId: string) => void;
  onReevaluateJob?: (jobId: string) => void;
  onIgnoreJob?: (jobId: string) => void;
  onRestoreJob?: (jobId: string) => void;
}) {
  const analysis = presentInboxJobAnalysis(
    job,
    resumeLibrary?.variants.length ? getDefaultResumeVariant(resumeLibrary).profile : null,
  );
  const linkedApplication = findApplicationForJob(
    applications ?? loadDashboardImport()?.applications ?? [],
    job,
  );
  const atApply = analysisAtApplyFromOutcome(
    linkedApplication
      ? loadDashboardAnalytics().outcomes.find((item) => item.applicationId === linkedApplication.id)
      : undefined,
  );
  const liveRecommendation = analysis.v2Decision;
  const showDivergentAnalyses = Boolean(
    atApply &&
      liveRecommendation &&
      (atApply.score !== analysis.score || atApply.recommendation !== liveRecommendation),
  );
  const showPrepare =
    Boolean(
      resumeLibrary &&
        resumeLibrary.variants.length > 0 &&
        onCreateApplicationPack &&
        canCreateApplicationPack(job, resumeLibrary) &&
        !job.applicationPack,
    );
  const sourceOpenable = isOpenableJobUrl(job.url);

  return (
    <ApplyFlowCard padding="md" data-testid={`job-inbox-card-${job.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ApplyFlowBadge tone={jobMatchDecisionTone(analysis.decision)}>
          {JOB_MATCH_DECISION_LABELS[analysis.decision]}
        </ApplyFlowBadge>
        {isJobMatchStale(job, resumeLibrary) ? (
          <ApplyFlowBadge tone="warning">{JOB_INBOX_STALE_LABEL}</ApplyFlowBadge>
        ) : null}
        <ApplyFlowBadge tone="neutral">{APPLYFLOW_APPLICATION_STATUS_LABELS_PT[job.status]}</ApplyFlowBadge>
        <span className="text-sm font-medium text-[color:var(--af-text)]">
          {job.title}
          {job.company ? ` · ${job.company}` : ""}
        </span>
        <span className="ml-auto tabular-nums text-sm text-[color:var(--af-text-muted)]">
          {analysis.score}/100
        </span>
      </div>
      {job.source === "remoteok" && sourceOpenable ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]"
            data-testid="remoteok-saved-attribution"
          >
            {JOB_DISCOVERY_SOURCE_REMOTEOK}
          </a>
          {" · "}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]"
          >
            {JOB_DISCOVERY_VIEW_LISTING_REMOTEOK}
          </a>
        </p>
      ) : null}
      {showDivergentAnalyses && atApply && liveRecommendation ? (
        <div className="mt-2 grid gap-1 text-xs text-[color:var(--af-text)]">
          <p>
            {JOB_INBOX_AT_APPLY_ANALYSIS}: {atApply.score} · {JOB_DECISION_V2_LABELS[atApply.recommendation]}
          </p>
          <p>
            {JOB_INBOX_CURRENT_ANALYSIS}: {analysis.score} · {JOB_DECISION_V2_LABELS[liveRecommendation]}
          </p>
        </div>
      ) : null}
      {job.evaluatedWith ? (
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
          {JOB_INBOX_MATCHED_WITH_PREFIX} {job.evaluatedWith.variantName}
        </p>
      ) : null}
      <JobMatchSkillLine job={job} />
      {analysis.decision === "needs_info" ? (
        <p className="mt-2 text-xs text-[color:var(--af-text)]">{JOB_INBOX_INCOMPLETE_HINT}</p>
      ) : null}
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={jobAnalysisPath(job.id)} className={applyFlowButtonClass({ variant: "primary", size: "sm" })}>
          {JOB_DECISION_V2_LINK}
        </Link>
        {sourceOpenable && job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
          >
            {JOB_QUEUE_OPEN_SOURCE_LABEL}
          </a>
        ) : null}
        {onReevaluateJob && isJobMatchStale(job, resumeLibrary) ? (
          <ApplyFlowButton variant="secondary" size="sm" onClick={() => onReevaluateJob(job.id)}>
            {JOB_INBOX_REEVALUATE_LABEL}
          </ApplyFlowButton>
        ) : null}
        {job.status === "reviewing" && onIgnoreJob ? (
          <ApplyFlowButton
            variant="secondary"
            size="sm"
            data-testid={`job-queue-ignore-${job.id}`}
            onClick={() => onIgnoreJob(job.id)}
          >
            {JOB_QUEUE_IGNORE_LABEL}
          </ApplyFlowButton>
        ) : null}
        {job.status === "ignored" && onRestoreJob ? (
          <ApplyFlowButton
            variant="secondary"
            size="sm"
            data-testid={`job-queue-restore-${job.id}`}
            onClick={() => onRestoreJob(job.id)}
          >
            {JOB_QUEUE_RESTORE_LABEL}
          </ApplyFlowButton>
        ) : null}
      </p>
      {job.curriculumRecommendation ? (
        <CurriculumRouterBlock job={job} recommendation={job.curriculumRecommendation} />
      ) : null}
      {showPrepare && resumeLibrary && onCreateApplicationPack ? (
        <ApplicationPackPrepare
          job={job}
          resumeLibrary={resumeLibrary}
          onCreateApplicationPack={onCreateApplicationPack}
        />
      ) : null}
      {job.applicationPack ? (
        <ApplicationPackView
          job={job}
          onTogglePackChecklist={onTogglePackChecklist}
          onMarkJobApplied={onMarkJobApplied}
        />
      ) : null}
    </ApplyFlowCard>
  );
}

export function JobInboxPanel({
  jobs,
  error,
  evaluatedWithName,
  matchAvailable = true,
  onEvaluatePaste,
  onSaveDiscoveredJob,
  resumeLibrary = null,
  onCreateApplicationPack,
  onTogglePackChecklist,
  onMarkJobApplied,
  onReevaluateJob,
  onIgnoreJob,
  onRestoreJob,
  applications,
}: {
  jobs: ApplyFlowJob[];
  error: string | null;
  evaluatedWithName?: string | null;
  matchAvailable?: boolean;
  onEvaluatePaste: (input: {
    description: string;
    title: string;
    company: string;
    url: string;
  }) => InboxEvaluateStatus | void | Promise<InboxEvaluateStatus | void>;
  onSaveDiscoveredJob?: (hit: JobSearchHit) => Promise<DiscoveredJobSaveStatus>;
  resumeLibrary?: ResumeLibrary | null;
  onCreateApplicationPack?: (jobId: string, variantId?: string) => void;
  onTogglePackChecklist?: (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => void;
  onMarkJobApplied?: (jobId: string) => void;
  onReevaluateJob?: (jobId: string) => void;
  onIgnoreJob?: (jobId: string) => void;
  onRestoreJob?: (jobId: string) => void;
  applications?: readonly ApplyFlowApplicationV2Envelope[];
}) {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [duplicateJob, setDuplicateJob] = useState<ApplyFlowJob | null>(null);
  const [queueView, setQueueView] = useState<OpportunityQueueView>("active");
  const [queueSort, setQueueSort] = useState<OpportunityQueueSort>("match");
  const [decisionFilter, setDecisionFilter] = useState<JobMatchDecision | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ApplyFlowJobSource | "all">("all");

  const queueCounts = useMemo(() => countOpportunityQueueViews(jobs), [jobs]);
  const visibleJobs = useMemo(
    () =>
      selectOpportunityQueueJobs(jobs, {
        view: queueView,
        sort: queueSort,
        decision: decisionFilter,
        source: sourceFilter,
      }),
    [jobs, queueView, queueSort, decisionFilter, sourceFilter],
  );

  const emptyMessage =
    visibleJobs.length === 0
      ? jobs.length === 0
        ? null
        : decisionFilter !== "all" || sourceFilter !== "all"
          ? JOB_QUEUE_EMPTY_FILTERED
          : queueView === "ignored"
            ? JOB_QUEUE_EMPTY_IGNORED
            : queueView === "active"
              ? JOB_QUEUE_EMPTY_ACTIVE
              : JOB_QUEUE_EMPTY_FILTERED
      : null;

  return (
    <ApplyFlowSection
      id="job-inbox"
      title={JOB_INBOX_TITLE}
      description={JOB_INBOX_DESCRIPTION}
    >
      <JobDiscoveryPanel
        matchAvailable={matchAvailable}
        onSave={onSaveDiscoveredJob}
        resumeLibrary={resumeLibrary}
      />
      <h3 className="mb-3 text-base font-semibold text-[color:var(--af-text)]">{JOB_DISCOVERY_PASTE_HEADING}</h3>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!matchAvailable) return;
          const existing = findJobByCanonicalUrl(jobs, url);
          if (existing) {
            setDuplicateJob(existing);
            return;
          }
          setDuplicateJob(null);
          void (async () => {
            const status = await Promise.resolve(onEvaluatePaste({ description, title, company, url }));
          if (!status) return;
          const next = nextInboxDraftAfterEvaluate(status, { description, title, company, url });
          setDescription(next.description);
          setTitle(next.title);
          setCompany(next.company);
          setUrl(next.url);
          if (status === "duplicate_url") {
            setDuplicateJob(findJobByCanonicalUrl(jobs, url) ?? null);
          }
          })();
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
          <ApplyFlowButton type="submit" variant="primary" size="md" disabled={!matchAvailable}>
            {JOB_INBOX_SUBMIT_LABEL}
          </ApplyFlowButton>
          <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
            {matchAvailable && evaluatedWithName
              ? `${JOB_INBOX_EVALUATED_WITH_PREFIX} ${evaluatedWithName}`
              : JOB_INBOX_NEEDS_RESUME}
          </p>
        </div>
      </form>

      {duplicateJob ? (
        <ApplyFlowCard variant="muted" padding="md" className="mt-4">
          <p className="text-sm text-[color:var(--af-text)]">{JOB_INBOX_DUPLICATE_URL}</p>
          <Link
            href={jobAnalysisPath(duplicateJob.id)}
            className={`${applyFlowButtonClass({ variant: "primary", size: "sm" })} mt-3`}
          >
            {JOB_INBOX_OPEN_EXISTING}
          </Link>
        </ApplyFlowCard>
      ) : null}

      {error ? (
        <ApplyFlowCard variant="danger" padding="md" role="alert" className="mt-4">
          <p className="text-sm text-red-100/90">{error}</p>
        </ApplyFlowCard>
      ) : null}

      {jobs.length > 0 ? (
        <div className="mt-5 grid gap-3" data-testid="job-opportunity-queue">
          <div
            role="tablist"
            aria-label={JOB_QUEUE_VIEW_LABEL}
            className="flex flex-wrap gap-2"
          >
            {(
              [
                ["active", JOB_QUEUE_VIEW_ACTIVE, queueCounts.active],
                ["all", JOB_QUEUE_VIEW_ALL, queueCounts.all],
                ["ignored", JOB_QUEUE_VIEW_IGNORED, queueCounts.ignored],
              ] as const
            ).map(([view, label, count]) => {
              const selected = queueView === view;
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`job-queue-view-${view}`}
                  className={applyFlowButtonClass({
                    variant: selected ? "primary" : "secondary",
                    size: "sm",
                  })}
                  onClick={() => setQueueView(view)}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              {JOB_QUEUE_SORT_LABEL}
              <select
                className={fieldClass}
                value={queueSort}
                data-testid="job-queue-sort"
                onChange={(event) => setQueueSort(event.target.value as OpportunityQueueSort)}
              >
                <option value="match">{JOB_QUEUE_SORT_MATCH}</option>
                <option value="recency">{JOB_QUEUE_SORT_RECENCY}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              {JOB_QUEUE_FILTER_DECISION}
              <select
                className={fieldClass}
                value={decisionFilter}
                data-testid="job-queue-filter-decision"
                onChange={(event) =>
                  setDecisionFilter(event.target.value as JobMatchDecision | "all")
                }
              >
                <option value="all">{JOB_QUEUE_FILTER_ALL}</option>
                {JOB_MATCH_DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>
                    {JOB_MATCH_DECISION_LABELS[decision]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              {JOB_QUEUE_FILTER_SOURCE}
              <select
                className={fieldClass}
                value={sourceFilter}
                data-testid="job-queue-filter-source"
                onChange={(event) =>
                  setSourceFilter(event.target.value as ApplyFlowJobSource | "all")
                }
              >
                <option value="all">{JOB_QUEUE_FILTER_ALL}</option>
                {APPLYFLOW_JOB_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {JOB_QUEUE_SOURCE_LABELS[source] ?? source}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {queueView === "ignored" ? (
            <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_QUEUE_HISTORICAL_NOTE}</p>
          ) : null}
          {emptyMessage ? (
            <p className="text-sm text-[color:var(--af-text-muted)]" data-testid="job-queue-empty">
              {emptyMessage}
            </p>
          ) : (
            <ul className="grid gap-3">
              {visibleJobs.map((job) => (
                <li key={job.id}>
                  <JobInboxCard
                    job={job}
                    resumeLibrary={resumeLibrary}
                    onCreateApplicationPack={onCreateApplicationPack}
                    onTogglePackChecklist={onTogglePackChecklist}
                    onMarkJobApplied={onMarkJobApplied}
                    onReevaluateJob={onReevaluateJob}
                    onIgnoreJob={onIgnoreJob}
                    onRestoreJob={onRestoreJob}
                    applications={applications}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </ApplyFlowSection>
  );
}
