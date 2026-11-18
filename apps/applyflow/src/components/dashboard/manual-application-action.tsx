"use client";

import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  APPLICATION_RECORDED_APPLICATION_DETAIL,
  APPLICATION_RECORDED_APPLICATION_TITLE,
  APPLICATION_RECORDED_BACK_TO_QUEUE,
  APPLICATION_RECORDED_EXTERNAL_NOTE,
  APPLICATION_RECORDED_JOB_MARKED_DETAIL,
  APPLICATION_RECORDED_JOB_MARKED_TITLE,
  APPLICATION_RECORDED_VIEW_APPLICATIONS,
  MANUAL_APPLICATION_CONFIRM_BLOCKED,
  MANUAL_APPLICATION_CONFIRM_LATER,
  MANUAL_APPLICATION_CONFIRM_PROMPT,
  MANUAL_APPLICATION_CONFIRM_YES,
  MANUAL_APPLICATION_DISCLOSURE,
  MANUAL_APPLICATION_FINAL_CONFIRM,
  MANUAL_APPLICATION_MARK_ERROR,
  MANUAL_APPLICATION_MARKING,
  MANUAL_APPLICATION_URL_UNAVAILABLE,
} from "@/components/dashboard/job-inbox-content";
import { JOB_DECISION_V2_BACK_HREF } from "@/components/dashboard/job-decision-v2-content";
import {
  openManualApplicationUrl,
  resolveManualApplicationCta,
} from "@/components/dashboard/manual-application-cta";
import type { ApplyFlowJob, ApplyFlowJobSource } from "@devflow/applyflow-core";
import Link from "next/link";
import { useId, useRef, useState } from "react";

type ConfirmPhase = "idle" | "awaiting" | "submitting" | "error" | "success";

export type ManualApplicationRecordKind = "job_stage" | "application";

export function ManualApplicationAction({
  job,
  onMarkJobApplied,
  recordKind = "job_stage",
  openUrl = openManualApplicationUrl,
  confirmFn = (message: string) => window.confirm(message),
}: {
  job: ApplyFlowJob;
  onMarkJobApplied?: (jobId: string) => void | Promise<void>;
  /** job_stage = only the opportunity moved to Aplicada; application = persisted Application updated. */
  recordKind?: ManualApplicationRecordKind;
  openUrl?: typeof openManualApplicationUrl;
  confirmFn?: (message: string) => boolean;
}) {
  const promptId = useId();
  const [phase, setPhase] = useState<ConfirmPhase>("idle");
  const submittingRef = useRef(false);
  const cta = resolveManualApplicationCta({
    url: job.url,
    officialApplyUrl: job.jobContext.officialApplyUrl,
    source: job.source as ApplyFlowJobSource,
  });

  if (job.status === "applied" && phase !== "success") {
    return null;
  }

  if (phase === "success") {
    const title =
      recordKind === "application" ? APPLICATION_RECORDED_APPLICATION_TITLE : APPLICATION_RECORDED_JOB_MARKED_TITLE;
    const detail =
      recordKind === "application" ? APPLICATION_RECORDED_APPLICATION_DETAIL : APPLICATION_RECORDED_JOB_MARKED_DETAIL;
    return (
      <ApplyFlowCard
        padding="md"
        className="mt-2"
        role="status"
        data-testid={`manual-app-success-${job.id}`}
      >
        <p className="text-sm font-semibold text-[color:var(--af-text)]">{title}</p>
        <p className="mt-1 text-sm text-[color:var(--af-text)]">{detail}</p>
        <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{APPLICATION_RECORDED_EXTERNAL_NOTE}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/applications"
            className={applyFlowButtonClass({ variant: "primary", size: "sm" })}
            data-testid={`manual-app-view-applications-${job.id}`}
          >
            {APPLICATION_RECORDED_VIEW_APPLICATIONS}
          </Link>
          <Link
            href={JOB_DECISION_V2_BACK_HREF}
            className={applyFlowButtonClass({ variant: "secondary", size: "sm" })}
            data-testid={`manual-app-back-queue-${job.id}`}
          >
            {APPLICATION_RECORDED_BACK_TO_QUEUE}
          </Link>
        </div>
      </ApplyFlowCard>
    );
  }

  if (cta.kind === "unavailable" || !cta.url) {
    return (
      <p className="mt-2 text-xs text-[color:var(--af-text-muted)]" data-testid={`manual-app-unavailable-${job.id}`}>
        {MANUAL_APPLICATION_URL_UNAVAILABLE}
      </p>
    );
  }

  const showDisclosure = phase === "idle";
  const showConfirm = phase === "awaiting" || phase === "submitting" || phase === "error";

  async function handleConfirmYes() {
    if (!onMarkJobApplied || submittingRef.current) return;
    if (!confirmFn(MANUAL_APPLICATION_FINAL_CONFIRM)) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      await onMarkJobApplied(job.id);
      setPhase("success");
    } catch {
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="mt-2 grid gap-2" data-testid={`manual-app-action-${job.id}`}>
      {showDisclosure ? (
        <p className="text-xs text-[color:var(--af-text-muted)]" data-testid={`manual-app-disclosure-${job.id}`}>
          {MANUAL_APPLICATION_DISCLOSURE}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ApplyFlowButton
          variant="secondary"
          size="sm"
          type="button"
          data-testid={`manual-app-open-${job.id}`}
          data-cta-kind={cta.kind}
          disabled={phase === "submitting"}
          onClick={() => {
            const opened = openUrl(cta.url!);
            if (!opened) return;
            setPhase("awaiting");
          }}
        >
          {cta.label}
        </ApplyFlowButton>
      </div>
      {showConfirm ? (
        <div
          className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted,transparent)] p-3"
          role="group"
          aria-labelledby={promptId}
          data-testid={`manual-app-confirm-${job.id}`}
        >
          <p id={promptId} className="text-sm font-medium text-[color:var(--af-text)]">
            {MANUAL_APPLICATION_CONFIRM_PROMPT}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ApplyFlowButton
              variant="outlineBrand"
              size="sm"
              type="button"
              data-testid={`manual-app-confirm-yes-${job.id}`}
              disabled={phase === "submitting" || !onMarkJobApplied}
              onClick={() => {
                void handleConfirmYes();
              }}
            >
              {phase === "submitting" ? MANUAL_APPLICATION_MARKING : MANUAL_APPLICATION_CONFIRM_YES}
            </ApplyFlowButton>
            <ApplyFlowButton
              variant="secondary"
              size="sm"
              type="button"
              data-testid={`manual-app-confirm-blocked-${job.id}`}
              disabled={phase === "submitting"}
              onClick={() => setPhase("idle")}
            >
              {MANUAL_APPLICATION_CONFIRM_BLOCKED}
            </ApplyFlowButton>
            <ApplyFlowButton
              variant="secondary"
              size="sm"
              type="button"
              data-testid={`manual-app-confirm-later-${job.id}`}
              disabled={phase === "submitting"}
              onClick={() => setPhase("idle")}
            >
              {MANUAL_APPLICATION_CONFIRM_LATER}
            </ApplyFlowButton>
          </div>
          {phase === "error" ? (
            <p className="mt-2 text-xs text-[color:var(--af-danger,var(--af-text))]" data-testid={`manual-app-error-${job.id}`}>
              {MANUAL_APPLICATION_MARK_ERROR}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
