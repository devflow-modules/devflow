"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  JOB_INBOX_COMPANY_LABEL,
  JOB_INBOX_DESCRIPTION,
  JOB_INBOX_EVALUATED_WITH_PREFIX,
  JOB_INBOX_EYEBROW,
  JOB_INBOX_PASTE_LABEL,
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_INBOX_TITLE_LABEL,
  JOB_INBOX_URL_LABEL,
  JOB_MATCH_DECISION_LABELS,
  jobMatchDecisionTone,
} from "@/components/dashboard/job-inbox-content";
import { APPLYFLOW_APPLICATION_STATUS_LABELS_PT, type ApplyFlowJob } from "@devflow/applyflow-core";
import { useState } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

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
              <ApplyFlowCard padding="md">
                <div className="flex flex-wrap items-center gap-2">
                  <ApplyFlowBadge tone={jobMatchDecisionTone(job.jobMatch.decision)}>
                    {JOB_MATCH_DECISION_LABELS[job.jobMatch.decision]}
                  </ApplyFlowBadge>
                  <ApplyFlowBadge tone="neutral">
                    {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[job.status]}
                  </ApplyFlowBadge>
                  <span className="text-sm font-medium text-[color:var(--af-text)]">
                    {job.title}
                    {job.company ? ` · ${job.company}` : ""}
                  </span>
                  <span className="ml-auto tabular-nums text-sm text-[color:var(--af-text-muted)]">
                    {job.jobMatch.score}/100
                  </span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
                  Match: {job.jobMatch.matchedSkills.slice(0, 8).join(", ") || "—"}
                  {job.jobMatch.missingSkills.length > 0
                    ? ` · Gaps: ${job.jobMatch.missingSkills.slice(0, 6).join(", ")}`
                    : ""}
                </p>
              </ApplyFlowCard>
            </li>
          ))}
        </ul>
      ) : null}
    </ApplyFlowSection>
  );
}
