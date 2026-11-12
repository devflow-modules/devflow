"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import {
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
import {
  openManualApplicationUrl,
  resolveManualApplicationCta,
} from "@/components/dashboard/manual-application-cta";
import type { ApplyFlowJob, ApplyFlowJobSource } from "@devflow/applyflow-core";
import { useId, useRef, useState } from "react";

type ConfirmPhase = "idle" | "awaiting" | "submitting" | "error";

export function ManualApplicationAction({
  job,
  onMarkJobApplied,
  openUrl = openManualApplicationUrl,
  confirmFn = (message: string) => window.confirm(message),
}: {
  job: ApplyFlowJob;
  onMarkJobApplied?: (jobId: string) => void | Promise<void>;
  openUrl?: typeof openManualApplicationUrl;
  confirmFn?: (message: string) => boolean;
}) {
  const promptId = useId();
  const [phase, setPhase] = useState<ConfirmPhase>("idle");
  const submittingRef = useRef(false);
  const cta = resolveManualApplicationCta({
    url: job.url,
    source: job.source as ApplyFlowJobSource,
  });

  if (job.status === "applied") {
    return null;
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
      // Parent updates job.status on success; keep local phase quiet on success.
      setPhase("idle");
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
