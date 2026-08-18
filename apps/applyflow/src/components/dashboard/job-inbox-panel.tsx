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
  canCreateApplicationPack,
  isOpenableJobUrl,
  resolveApplicationPackResume,
  type ApplicationPack,
  type ApplicationPackChecklistId,
  type ApplyFlowJob,
  type CurriculumRecommendation,
  type ResumeLibrary,
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
  resumeLibrary,
  onCreateApplicationPack,
  onTogglePackChecklist,
  onMarkJobApplied,
}: {
  job: ApplyFlowJob;
  resumeLibrary?: ResumeLibrary | null;
  onCreateApplicationPack?: (jobId: string, variantId?: string) => void;
  onTogglePackChecklist?: (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => void;
  onMarkJobApplied?: (jobId: string) => void;
}) {
  const showPrepare =
    Boolean(
      resumeLibrary &&
        resumeLibrary.variants.length > 0 &&
        onCreateApplicationPack &&
        canCreateApplicationPack(job) &&
        !job.applicationPack,
    );

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
  onEvaluatePaste,
  resumeLibrary = null,
  onCreateApplicationPack,
  onTogglePackChecklist,
  onMarkJobApplied,
}: {
  jobs: ApplyFlowJob[];
  error: string | null;
  evaluatedWithName: string;
  onEvaluatePaste: (input: { description: string; title: string; company: string; url: string }) => void;
  resumeLibrary?: ResumeLibrary | null;
  onCreateApplicationPack?: (jobId: string, variantId?: string) => void;
  onTogglePackChecklist?: (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => void;
  onMarkJobApplied?: (jobId: string) => void;
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
              <JobInboxCard
                job={job}
                resumeLibrary={resumeLibrary}
                onCreateApplicationPack={onCreateApplicationPack}
                onTogglePackChecklist={onTogglePackChecklist}
                onMarkJobApplied={onMarkJobApplied}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </ApplyFlowSection>
  );
}
