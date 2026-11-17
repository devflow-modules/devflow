"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  JOB_DECISION_V2_PACK_BLOCK_ITEMS,
  JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS,
  JOB_DECISION_V2_PACK_BLOCK_NEXT,
  JOB_READINESS_RECOMMENDED_RESUME,
  JOB_READINESS_SELECTED_RESUME,
} from "@/components/dashboard/job-decision-v2-content";
import {
  MANUAL_PREP_GAPS,
  MANUAL_PREP_HIDE,
  MANUAL_PREP_HINT,
  MANUAL_PREP_LISTING,
  MANUAL_PREP_NO_GAPS,
  MANUAL_PREP_OPEN,
  MANUAL_PREP_OPEN_LISTING,
  MANUAL_PREP_RESUME,
  MANUAL_PREP_SAVED_PACK,
  MANUAL_PREP_SAVED_PACK_HINT,
  MANUAL_PREP_TITLE,
} from "@/components/dashboard/job-inbox-content";
import {
  explainPackBlock,
  humanizePackBlockLabel,
  isOpenableJobUrl,
  type ApplicationPack,
  type ApplicationPackV2,
  type ApplyFlowJob,
  type JobDecisionV2,
  type PackBlockExplanation,
} from "@devflow/applyflow-core";
import { useId, useMemo, useState } from "react";

function buildGapLabels(input: {
  explanation: PackBlockExplanation;
  decision?: JobDecisionV2 | null;
  job: ApplyFlowJob;
}): string[] {
  const fromExplanation = input.explanation.items.map((item) => item.label);
  const fromMatch = [
    ...(input.job.jobMatch?.missingSkills ?? []),
    ...(input.job.jobMatch?.unknownSkills ?? []),
  ].map((label) => humanizePackBlockLabel(label));
  const fromInputs = (input.decision?.candidateInputRequests ?? [])
    .map((item) => humanizePackBlockLabel(item.question))
    // Engine may ask "trabalhou com Senioridade: sênior?" — skip malformed seniority prompts.
    .filter((label) => !/trabalhou profissionalmente com\s+senioridade\s*:/i.test(label));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of [...fromExplanation, ...fromMatch, ...fromInputs]) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    // Skip engine geography labels that the explanation already reframed.
    if (/^remote locations:/i.test(label) || /^locations:\s*brazil$/i.test(label)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out.slice(0, 12);
}

export function ManualPreparationPanel({
  job,
  decision = null,
  pack = null,
  savedPack = null,
  resumeName = null,
  recommendedResumeName = null,
  selectedResumeName = null,
  hasResume = false,
  defaultOpen = false,
  explanation: explanationProp,
}: {
  job: ApplyFlowJob;
  decision?: JobDecisionV2 | null;
  pack?: ApplicationPackV2 | null;
  /** Existing V1 Application Pack snapshot — shown read-only when present. */
  savedPack?: ApplicationPack | null;
  resumeName?: string | null;
  recommendedResumeName?: string | null;
  selectedResumeName?: string | null;
  hasResume?: boolean;
  defaultOpen?: boolean;
  explanation?: PackBlockExplanation;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const explanation = useMemo(
    () =>
      explanationProp ??
      explainPackBlock({
        decision,
        pack,
        jobText: job.descriptionSnapshot,
        hasJobText: Boolean(job.descriptionSnapshot?.trim()),
        hasResume,
        hasSourceUrl: isOpenableJobUrl(job.url),
      }),
    [decision, explanationProp, hasResume, job.descriptionSnapshot, job.url, pack],
  );

  if (!explanation.blocked || !explanation.canPrepareManually) return null;

  const gaps = buildGapLabels({ explanation, decision, job });
  const listingOpenable = isOpenableJobUrl(job.url);

  return (
    <ApplyFlowCard padding="md" data-testid={`manual-prep-panel-${job.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {MANUAL_PREP_TITLE}
          </p>
          <p className="mt-1 text-sm text-[color:var(--af-text)]">{explanation.title}</p>
          <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{MANUAL_PREP_HINT}</p>
        </div>
        <ApplyFlowButton
          type="button"
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-controls={detailsId}
          data-testid={`manual-prep-toggle-${job.id}`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? MANUAL_PREP_HIDE : MANUAL_PREP_OPEN}
        </ApplyFlowButton>
      </div>

      <div className="mt-3 grid gap-2" data-testid={`manual-prep-block-summary-${job.id}`}>
        <p className="text-sm text-[color:var(--af-text)]">{explanation.summary}</p>
        <p className="text-xs text-[color:var(--af-text-muted)]">
          <span className="font-medium text-[color:var(--af-text)]">{JOB_DECISION_V2_PACK_BLOCK_NEXT}: </span>
          {explanation.nextAction}
        </p>
      </div>

      {open ? (
        <div id={detailsId} className="mt-4 grid gap-4" data-testid={`manual-prep-details-${job.id}`}>
          {explanation.items.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_PACK_BLOCK_ITEMS}
              </p>
              <ul className="mt-2 grid gap-2">
                {explanation.items.map((item) => (
                  <li
                    key={`${item.kind}-${item.label}`}
                    className="flex flex-wrap items-start gap-2 text-sm text-[color:var(--af-text)]"
                  >
                    <ApplyFlowBadge tone="neutral">{JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS[item.kind]}</ApplyFlowBadge>
                    <span className="min-w-0">
                      {item.label}
                      {item.detail ? (
                        <span className="mt-0.5 block text-xs text-[color:var(--af-text-muted)]">{item.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {MANUAL_PREP_LISTING}
              </p>
              {listingOpenable ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-emerald-300 underline-offset-2 hover:underline hover:text-emerald-200"
                  data-testid={`manual-prep-open-listing-${job.id}`}
                >
                  {MANUAL_PREP_OPEN_LISTING}
                </a>
              ) : (
                <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">Sem URL de anúncio aberta.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {MANUAL_PREP_RESUME}
              </p>
              <div className="mt-1 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
                {resumeName ? <p>{resumeName}</p> : null}
                {recommendedResumeName ? (
                  <p>
                    {JOB_READINESS_RECOMMENDED_RESUME}: {recommendedResumeName}
                  </p>
                ) : null}
                {selectedResumeName ? (
                  <p>
                    {JOB_READINESS_SELECTED_RESUME}: {selectedResumeName}
                  </p>
                ) : null}
                {!resumeName && !recommendedResumeName && !selectedResumeName ? (
                  <p>Nenhum currículo indicado nesta vista.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
              {MANUAL_PREP_GAPS}
            </p>
            {gaps.length > 0 ? (
              <ul className="mt-2 grid gap-2" data-testid={`manual-prep-gaps-${job.id}`}>
                {gaps.map((label) => (
                  <li key={label} className="flex items-start gap-2 text-sm text-[color:var(--af-text)]">
                    <input
                      type="checkbox"
                      disabled
                      aria-disabled="true"
                      className="mt-1"
                      data-testid={`manual-prep-gap-check-${job.id}`}
                    />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{MANUAL_PREP_NO_GAPS}</p>
            )}
          </div>

          {savedPack ? (
            <div
              className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] p-3"
              data-testid={`manual-prep-saved-pack-${job.id}`}
            >
              <p className="text-sm font-medium text-[color:var(--af-text)]">{MANUAL_PREP_SAVED_PACK}</p>
              <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{MANUAL_PREP_SAVED_PACK_HINT}</p>
              <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{savedPack.resume.variantName}</p>
              {savedPack.gaps.length > 0 ? (
                <ul className="mt-2 grid gap-1 text-xs text-[color:var(--af-text)]">
                  {savedPack.gaps.slice(0, 8).map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </ApplyFlowCard>
  );
}
