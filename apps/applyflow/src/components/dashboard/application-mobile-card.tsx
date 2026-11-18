"use client";

import Link from "next/link";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { applicationStatusTone } from "@/components/ui/status-tones";
import { DashboardJobUrlCell } from "@/components/dashboard/dashboard-job-url-cell";
import { JOB_DISCOVERY_SOURCE_REMOTEOK } from "@/components/dashboard/job-inbox-content";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  deriveApplicationNextAction,
  formatApplicationStaleUpdateAge,
  formatApplicationUpdatedAge,
  isDisplayDerivedFromAppliedJob,
  isOpenableJobUrl,
  type ApplyFlowApplication,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";
import { DASHBOARD_DERIVED_APPLICATION_HINT } from "@/components/dashboard/dashboard-work-content";

export function ApplicationMobileCard({
  application,
  linkedJob,
  markSentLabel,
  prepareInterviewLabel,
  prepareInterviewHint,
  analysisLabel,
  practiceBusy,
  persistActionsEnabled = true,
  onMarkSent,
  onPractice,
}: {
  application: ApplyFlowApplication;
  linkedJob?: ApplyFlowJob;
  markSentLabel: string;
  prepareInterviewLabel: string;
  prepareInterviewHint: string;
  analysisLabel: string;
  practiceBusy: boolean;
  /** False for read-only rows derived from applied jobs without a persisted Application. */
  persistActionsEnabled?: boolean;
  onMarkSent: () => void;
  onPractice: () => void;
}) {
  const envelope = application as ApplyFlowApplicationV2Envelope;
  const derived = isDisplayDerivedFromAppliedJob(envelope) || !persistActionsEnabled;
  const nextHint = deriveApplicationNextAction({
    status: application.status,
    jobId: envelope.v2?.sourceJobId,
  });
  const ageHint = derived
    ? null
    : formatApplicationStaleUpdateAge(application.updatedAt) ??
      formatApplicationUpdatedAge(application.updatedAt);
  const showRemoteOk =
    linkedJob?.source === "remoteok" && isOpenableJobUrl(linkedJob.url ?? application.jobUrl);
  const remoteOkUrl = linkedJob?.url ?? application.jobUrl;
  const createdAtMs = Date.parse(application.createdAt);
  const createdAtLabel = Number.isFinite(createdAtMs)
    ? new Date(createdAtMs).toLocaleDateString("pt-BR")
    : "—";

  return (
    <ApplyFlowCard
      padding="md"
      className="grid gap-3"
      data-testid={derived ? "application-mobile-card-derived" : "application-mobile-card"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--af-text)]">
            {application.jobTitle ?? "—"}
          </p>
          <p className="truncate text-xs text-[color:var(--af-text-muted)]">
            {application.companyName ?? "—"}
          </p>
        </div>
        <ApplyFlowBadge tone={applicationStatusTone(application.status)}>
          {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[application.status]}
        </ApplyFlowBadge>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--af-text-muted)]">
        <span>{createdAtLabel}</span>
        {ageHint ? <span data-testid="application-row-age">{ageHint.label}</span> : null}
        {application.fitScore != null ? <span>Fit {application.fitScore}</span> : null}
      </div>

      {derived ? (
        <p className="text-xs text-[color:var(--af-text-muted)]" data-testid="application-row-derived-hint">
          {DASHBOARD_DERIVED_APPLICATION_HINT}
        </p>
      ) : nextHint.kind !== "terminal" && nextHint.kind !== "none" ? (
        <p className="text-xs text-[color:var(--af-text)]" data-testid="application-row-next-action">
          {nextHint.label}
        </p>
      ) : null}

      {showRemoteOk && remoteOkUrl ? (
        <a
          href={remoteOkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[color:var(--af-text-muted)] underline-offset-2 hover:underline"
          data-testid="remoteok-applications-attribution"
        >
          {JOB_DISCOVERY_SOURCE_REMOTEOK}
        </a>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!derived && application.status === "reviewing" ? (
          <ApplyFlowButton type="button" variant="outlineBrand" size="sm" onClick={onMarkSent}>
            {markSentLabel}
          </ApplyFlowButton>
        ) : null}
        {!derived ? (
          <ApplyFlowButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={practiceBusy}
            title={prepareInterviewHint}
            onClick={onPractice}
          >
            {prepareInterviewLabel}
          </ApplyFlowButton>
        ) : null}
        {envelope.v2?.sourceJobId ? (
          <Link
            href={`/dashboard/jobs/${encodeURIComponent(envelope.v2.sourceJobId)}`}
            className="inline-flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            {analysisLabel}
          </Link>
        ) : null}
        <DashboardJobUrlCell url={application.jobUrl} />
      </div>
    </ApplyFlowCard>
  );
}
