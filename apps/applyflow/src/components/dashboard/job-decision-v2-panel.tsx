"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowLoadingState } from "@/components/ui/ApplyFlowLoadingState";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { applyFlowControlClass } from "@/components/ui/apply-flow-control-classes";
import {
  applicationDecisionTone,
  evidenceMatchTone,
  readinessTone,
} from "@/components/ui/status-tones";
import { loadJobDecisionV2Snapshot } from "@/lib/job-decision-v2-snapshot";
import { DashboardPersistenceNotice, dashboardPersistenceFailureMessage } from "@/components/dashboard/dashboard-persistence-notice";
import { DashboardMigrationPanel } from "@/components/dashboard/dashboard-migration-panel";
import type { ApplyFlowClientPersistenceBootstrapResult } from "@/lib/persistence-v2/dashboard/client-persistence-bootstrap";
import type { ApplyFlowDashboardPersistence } from "@/lib/persistence-v2/dashboard/dashboard-persistence";
import { openDashboardPersistence } from "@/lib/persistence-v2/dashboard/open-dashboard-persistence";
import {
  persistApplicationStatusTransition,
  persistApplicationSubmitted,
  persistApplicationWithOutcome,
  persistClosedLoopV1Backfill,
} from "@/lib/persist-application-decision";
import { loadDashboardImport } from "@/lib/local-import-storage";
import { resolveV2CandidateContext } from "@/lib/v2-candidate-context";
import { getInterviewLabImportHandoffUrl } from "@/lib/interview-lab-handoff";
import { useClientHydrated } from "@/lib/use-client-hydrated";
import {
  APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT,
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  canRecordApplicationOutcome,
  canTransitionApplicationStatus,
  collectApplicationAgeCopies,
  deriveApplicationNextAction,
  deriveApplicationReadiness,
  findApplicationForJob,
  formatLifecycleEventDate,
  isOpenableJobUrl,
  resolveApplicationRegistration,
  resolvePipelineStatus,
  type ApplicationReadiness,
  type ApplicationReadinessItem,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type ApplyFlowPipelineStatusV2,
  type Contact,
  type JobDecisionV2,
} from "@devflow/applyflow-core";
import {
  cloudLifecycleFailureMessage,
  transitionCloudApplicationLifecycle,
} from "@/lib/cloud-application-transition";

import {
  JOB_DISCOVERY_SOURCE_REMOTEOK,
  JOB_DISCOVERY_VIEW_LISTING_REMOTEOK,
} from "@/components/dashboard/job-inbox-content";
import {
  JOB_DECISION_V2_BACK,
  JOB_DECISION_V2_CLAIMS,
  JOB_DECISION_V2_CLAIMS_EMPTY,
  JOB_DECISION_V2_DIMENSIONS,
  JOB_DECISION_V2_EYEBROW,
  JOB_DECISION_V2_GATES,
  JOB_DECISION_V2_GATE_RESULT_LABELS,
  JOB_DECISION_V2_HINT,
  JOB_DECISION_V2_INPUTS,
  JOB_DECISION_V2_LABELS,
  JOB_DECISION_V2_MISSING,
  JOB_DECISION_V2_NO_TEXT,
  JOB_DECISION_V2_NEED_APPLICATION,
  JOB_DECISION_V2_NEED_RESUME,
  JOB_DECISION_V2_OPEN_LAB,
  JOB_DECISION_V2_INPUTS_HINT,
  JOB_DECISION_V2_LAB_HANDOFF,
  JOB_DECISION_V2_PACK_BLOCKED,
  JOB_DECISION_V2_PACK_INCOMPLETE,
  JOB_DECISION_V2_INCOMPLETE,
  JOB_DECISION_V2_REQUIREMENTS,
  JOB_DECISION_V2_TABS,
  JOB_DECISION_V2_TITLE,
  JOB_DECISION_V2_CREATE_APPLICATION,
  JOB_DECISION_V2_CREATE_HINT,
  JOB_DECISION_V2_APPLICATION_READY,
  JOB_DECISION_V2_MARK_SENT,
  JOB_DECISION_V2_MARK_SENT_HINT,
  JOB_DECISION_V2_MARKED_SENT,
  JOB_DECISION_V2_NEXT_STEP,
  JOB_DECISION_V2_AGE,
  JOB_DECISION_V2_HISTORY_UNAVAILABLE,
  JOB_DECISION_V2_CURRENT_ANALYSIS,
  JOB_DECISION_V2_AT_APPLY_ANALYSIS,
  JOB_DECISION_V2_CURRENT_HINT,
  JOB_DECISION_V2_REGISTERED_PRESERVED,
  JOB_DECISION_V2_HISTORY,
  JOB_DECISION_V2_STATUS,
  JOB_DECISION_V2_HIRED,
  JOB_READINESS_TITLE,
  JOB_READINESS_OPEN_SOURCE,
  JOB_READINESS_MATCH_EVALUATED_WITH,
  JOB_READINESS_RECOMMENDED_RESUME,
  JOB_READINESS_SELECTED_RESUME,
  JOB_READINESS_ITEM_LABELS,
  JOB_READINESS_REASON_LABELS,
  JOB_READINESS_STATE_LABELS,
  analysesDivergeOnPage,
  registeredAnalysisFromSnapshot,
} from "./job-decision-v2-content";
import { JobDecisionV2NetworkingTab } from "./job-decision-v2-networking-tab";

type JobV2Tab = keyof typeof JOB_DECISION_V2_TABS;

const EMPTY_CONTACTS: Contact[] = [];

function readinessItemLabel(item: ApplicationReadinessItem): string {
  const base = JOB_READINESS_ITEM_LABELS[item.id];
  const reason = JOB_READINESS_REASON_LABELS[item.reason] ?? item.reason;
  if (item.detail && (item.id === "gaps" || item.id === "analyzed" || item.id === "curriculum")) {
    return `${base}: ${reason}${item.detail ? ` (${item.detail})` : ""}`;
  }
  return `${base}: ${reason}`;
}

function ApplicationReadinessBlock({
  readiness,
  job,
}: {
  readiness: ApplicationReadiness;
  job: ApplyFlowJob;
}) {
  return (
    <ApplyFlowCard padding="md" data-testid="application-readiness">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
        {JOB_READINESS_TITLE}
      </p>
      <ul className="mt-3 grid gap-2" aria-label={JOB_READINESS_TITLE}>
        {readiness.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--af-text)]">
            <ApplyFlowBadge tone={readinessTone(item.state)}>
              {JOB_READINESS_STATE_LABELS[item.state]}
            </ApplyFlowBadge>
            <span>{readinessItemLabel(item)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-1 text-xs text-[color:var(--af-text-muted)]">
        {readiness.evaluatedWithVariantName ? (
          <p>
            {JOB_READINESS_MATCH_EVALUATED_WITH}: {readiness.evaluatedWithVariantName}
          </p>
        ) : null}
        {readiness.recommendedResumeVariantName ? (
          <p>
            {JOB_READINESS_RECOMMENDED_RESUME}: {readiness.recommendedResumeVariantName}
          </p>
        ) : null}
        {readiness.selectedResumeVariantName ? (
          <p>
            {JOB_READINESS_SELECTED_RESUME}: {readiness.selectedResumeVariantName}
          </p>
        ) : null}
      </div>
      {readiness.hasSourceUrl && job.url ? (
        <p className="mt-3">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-300 underline-offset-2 hover:underline hover:text-emerald-200"
            data-testid="application-readiness-open-source"
          >
            {JOB_READINESS_OPEN_SOURCE}
          </a>
        </p>
      ) : null}
    </ApplyFlowCard>
  );
}

function ApplicationOutcomeCard({
  application,
  currentPipeline,
  nextActionGuidance,
  applicationAgeCopies,
  persistError,
  feedbackNote,
  setFeedbackNote,
  markApplicationSent,
  recordStatus,
  lifecycleEvents,
  usesCloudPersistence,
  canCreate,
  createApplicationRecord,
  decision,
}: {
  application: ApplyFlowApplicationV2Envelope | null;
  currentPipeline: ApplyFlowPipelineStatusV2 | null;
  nextActionGuidance: ReturnType<typeof deriveApplicationNextAction> | null;
  applicationAgeCopies: ReturnType<typeof collectApplicationAgeCopies>;
  persistError: string | null;
  feedbackNote: string;
  setFeedbackNote: (value: string) => void;
  markApplicationSent: () => void;
  recordStatus: (status: ApplyFlowPipelineStatusV2) => void;
  lifecycleEvents: import("@devflow/applyflow-core").ApplicationCareerEvent[];
  usesCloudPersistence: boolean;
  canCreate: boolean;
  createApplicationRecord: () => void;
  decision: JobDecisionV2 | null;
}) {
  return (
    <ApplyFlowCard padding="md" data-testid="application-outcome-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">
        Candidatura
      </p>
      <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
        Não infere rejection reason a partir de GAP. Sem motivo explícito, a categoria fica unknown.
      </p>
      {persistError ? <p className="mt-2 text-xs text-red-200" role="alert">{persistError}</p> : null}
      {application ? (
        <div className="mt-4 grid gap-4">
          <div
            className="rounded-[var(--af-radius-sm)] border border-emerald-500/25 bg-emerald-950/20 px-3 py-3"
            data-testid="application-current-state"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
              {JOB_DECISION_V2_STATUS}
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight text-[color:var(--af-text)]">
              {currentPipeline
                ? APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[currentPipeline]
                : APPLYFLOW_APPLICATION_STATUS_LABELS_PT[application.status]}
            </p>
            <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_APPLICATION_READY}</p>
          </div>

          {nextActionGuidance && nextActionGuidance.kind !== "none" ? (
            <div
              className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-2.5"
              data-testid="application-next-action"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_NEXT_STEP}
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--af-text)]">{nextActionGuidance.label}</p>
              {nextActionGuidance.detail ? (
                <p className="mt-0.5 text-xs text-[color:var(--af-text-muted)]">{nextActionGuidance.detail}</p>
              ) : null}
            </div>
          ) : null}

          {applicationAgeCopies.length > 0 ? (
            <div data-testid="application-age-copy">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_AGE}
              </p>
              <ul className="mt-1 grid gap-0.5 text-[11px] text-[color:var(--af-text-muted)]">
                {applicationAgeCopies.map((item) => (
                  <li key={item.kind}>{item.label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {application.status === "reviewing" ? (
            <div className="grid gap-2">
              <p className="text-xs text-[color:var(--af-text)]">{JOB_DECISION_V2_MARK_SENT_HINT}</p>
              <ApplyFlowButton
                type="button"
                variant="primary"
                size="sm"
                onClick={markApplicationSent}
                data-testid="mark-application-sent"
                className="w-fit"
              >
                {JOB_DECISION_V2_MARK_SENT}
              </ApplyFlowButton>
            </div>
          ) : currentPipeline === "applied" ? (
            <p className="text-xs text-emerald-200/90">{JOB_DECISION_V2_MARKED_SENT}</p>
          ) : null}
        </div>
      ) : canCreate ? (
        <div className="mt-4 grid gap-2">
          <p className="text-xs text-[color:var(--af-text)]">{JOB_DECISION_V2_NEED_APPLICATION}</p>
          <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CREATE_HINT}</p>
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!decision}
            data-testid="register-application"
            onClick={createApplicationRecord}
            className="w-fit"
          >
            {JOB_DECISION_V2_CREATE_APPLICATION}
          </ApplyFlowButton>
        </div>
      ) : null}

      {application ? (
        <div className="mt-5 border-t border-[color:var(--af-border)] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Transições disponíveis
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["recruiter_contacted", "Response"],
                ["screening", "Screening"],
                ["technical", "Technical"],
                ["final", "Final"],
                ["offer", "Offer"],
                ["hired", JOB_DECISION_V2_HIRED],
                ["rejected", "Rejection"],
                ["withdrawn", "Withdrawal"],
              ] as const
            ).map(([status, label]) => {
              const enabled =
                Boolean(application && currentPipeline && canTransitionApplicationStatus(currentPipeline, status));
              const danger = status === "rejected" || status === "withdrawn";
              return (
                <ApplyFlowButton
                  key={status}
                  type="button"
                  variant={danger ? "dangerGhost" : "secondary"}
                  size="sm"
                  onClick={() => recordStatus(status)}
                  disabled={!enabled}
                  data-testid={`lifecycle-${status}`}
                >
                  {label}
                </ApplyFlowButton>
              );
            })}
          </div>
        </div>
      ) : null}

      {lifecycleEvents.length > 0 ? (
        <div className="mt-4" data-testid="application-lifecycle-timeline">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
            {JOB_DECISION_V2_HISTORY}
          </p>
          <ul className="mt-2 grid gap-1 text-xs text-[color:var(--af-text)]">
            {lifecycleEvents.map((item) => (
              <li key={item.id}>
                {formatLifecycleEventDate(item.occurredAt)} —{" "}
                {item.toStatus ? APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[item.toStatus] : item.type}
              </li>
            ))}
          </ul>
        </div>
      ) : application && usesCloudPersistence ? (
        <p className="mt-4 text-[11px] text-[color:var(--af-text-muted)]" data-testid="application-lifecycle-history-unavailable">
          {JOB_DECISION_V2_HISTORY_UNAVAILABLE}
        </p>
      ) : null}
      <input
        value={feedbackNote}
        onChange={(event) => setFeedbackNote(event.target.value)}
        placeholder="Motivo explícito / nota (opcional)"
        className={`${applyFlowControlClass} mt-3`}
      />
    </ApplyFlowCard>
  );
}

export function JobDecisionV2Panel({
  jobId,
  persistenceBootstrap,
}: {
  jobId: string;
  persistenceBootstrap: ApplyFlowClientPersistenceBootstrapResult;
}) {
  const hydrated = useClientHydrated();
  const [storageEpoch, setStorageEpoch] = useState(0);
  const [usesCloudPersistence, setUsesCloudPersistence] = useState(false);
  const [writeCapability, setWriteCapability] = useState<"full" | "read_only">("full");
  const [remoteGate, setRemoteGate] = useState<
    "migration_required" | "auth_required" | "error" | "paused" | "bootstrap_unavailable" | null
  >(null);
  const [remoteRecords, setRemoteRecords] = useState<{
    job: ApplyFlowJob | null;
    application: ApplyFlowApplicationV2Envelope | null;
  } | null>(null);
  const persistenceRef = useRef<ApplyFlowDashboardPersistence | null>(null);
  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    if (usesCloudPersistence) {
      if (!remoteRecords) return null;
      return loadJobDecisionV2Snapshot(jobId, storageEpoch, remoteRecords);
    }
    return loadJobDecisionV2Snapshot(jobId, storageEpoch);
  }, [hydrated, jobId, usesCloudPersistence, remoteRecords, storageEpoch]);

  useEffect(() => {
    if (!hydrated || usesCloudPersistence) return;
    persistClosedLoopV1Backfill();
  }, [hydrated, jobId, usesCloudPersistence]);

  useEffect(() => {
    if (!hydrated) return;
    if (!persistenceBootstrap.ok) return;
    let cancelled = false;
    void openDashboardPersistence({ bootstrap: persistenceBootstrap.bootstrap }).then((opened) => {
      if (cancelled) return;
      if (opened.kind === "ready") {
        persistenceRef.current = opened.persistence;
        setUsesCloudPersistence(true);
        setWriteCapability(opened.writeCapability);
        const job = opened.jobs.find((item) => item.id === jobId) ?? null;
        setRemoteRecords({
          job,
          application: job ? (findApplicationForJob(opened.applications, job) ?? null) : null,
        });
        setRemoteGate(null);
        return;
      }
      if (
        opened.kind === "v1" ||
        opened.kind === "v2_offering_empty_pending" ||
        opened.kind === "migration_complete_pending_activation"
      ) {
        persistenceRef.current = opened.persistence;
        setUsesCloudPersistence(false);
        setWriteCapability("full");
        setRemoteRecords(null);
        setRemoteGate(null);
        return;
      }
      persistenceRef.current = null;
      setUsesCloudPersistence(false);
      if (opened.kind === "migration_required") setRemoteGate("migration_required");
      else if (opened.kind === "auth_required") setRemoteGate("auth_required");
      else if (opened.kind === "error") setRemoteGate("error");
      else if (opened.kind === "paused") setRemoteGate("paused");
      else if (opened.kind === "bootstrap_unavailable") setRemoteGate("bootstrap_unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, jobId, persistenceBootstrap]);
  const job = snapshot?.job;
  const decision = snapshot?.decision ?? null;
  const pack = snapshot?.pack ?? null;
  const contacts = snapshot?.contacts ?? EMPTY_CONTACTS;
  const application = snapshot?.application ?? null;
  const registeredSnapshot = snapshot?.registeredSnapshot ?? null;
  const lifecycleEvents = snapshot?.lifecycleEvents ?? [];
  const pipelineStatus = snapshot?.pipelineStatus ?? null;
  const needsResume = snapshot?.needsResume ?? false;
  const [tab, setTab] = useState<JobV2Tab>("overview");
  const [feedbackNote, setFeedbackNote] = useState<string>("");
  const [persistError, setPersistError] = useState<string | null>(null);

  const dimensions = useMemo(() => {
    if (!decision) return [];
    const d = decision.dimensions;
    return [
      ["Overall", d.overall],
      ["Core engineering", d.coreEngineering],
      ["Stack", d.stack],
      ["Specialization", d.specialization],
      ["Seniority", d.seniority],
      ["Product", d.product],
      ["Cloud", d.cloud],
      ["AI", d.ai],
      ["Language", d.language],
    ].filter((row): row is [string, number] => typeof row[1] === "number");
  }, [decision]);

  const readiness = useMemo(() => {
    if (!job) return null;
    const ctx = resolveV2CandidateContext();
    return deriveApplicationReadiness({
      job,
      resumeLibrary: ctx.ok ? ctx.library : null,
      application,
    });
  }, [job, application]);

  const registeredAnalysis = useMemo(
    () => registeredAnalysisFromSnapshot(registeredSnapshot),
    [registeredSnapshot],
  );
  const showDivergentAnalyses = analysesDivergeOnPage(
    registeredAnalysis,
    decision ? { overall: decision.overall, decision: decision.decision } : null,
  );
  const currentPipeline = application
    ? pipelineStatus ?? resolvePipelineStatus({ application, outcome: undefined })
    : null;
  const nextActionGuidance = useMemo(() => {
    if (!application || !currentPipeline) return null;
    return deriveApplicationNextAction({
      status: currentPipeline,
      jobId: job?.id ?? application.v2?.sourceJobId,
    });
  }, [application, currentPipeline, job?.id]);
  const applicationAgeCopies = useMemo(() => {
    if (!application) return [];
    const appliedAt =
      application.appliedAt ??
      (snapshot?.lifecycleAppliedAt ? snapshot.lifecycleAppliedAt : undefined);
    return collectApplicationAgeCopies({
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      appliedAt: appliedAt ?? null,
    });
  }, [application, snapshot?.lifecycleAppliedAt]);

  function createApplicationRecord() {
    if (!job || !decision) return;
    if (writeCapability === "read_only") {
      setPersistError(dashboardPersistenceFailureMessage("read_only"));
      return;
    }
    if (application) return;

    void (async () => {
      const packForCreate = pack && pack.status === "ready" ? pack : undefined;
      if (usesCloudPersistence) {
        const persistence = persistenceRef.current;
        if (!persistence) return;
        const apps = await persistence.listApplications();
        const resolved = resolveApplicationRegistration({
          applications: apps,
          job,
          decision,
          pack: packForCreate,
        });
        if (resolved.kind === "existing") {
          setPersistError(null);
          setRemoteRecords({ job, application: resolved.application });
          return;
        }
        const result = await persistence.createApplication(resolved.application);
        if (!result.ok) {
          setPersistError(dashboardPersistenceFailureMessage(result.code));
          return;
        }
        setPersistError(null);
        setRemoteRecords({ job, application: result.data });
        return;
      }

      const localApps = (loadDashboardImport()?.applications ?? []) as ApplyFlowApplicationV2Envelope[];
      const resolved = resolveApplicationRegistration({
        applications: localApps,
        job,
        decision,
        pack: packForCreate,
      });
      if (resolved.kind === "existing") {
        setPersistError(null);
        refreshAfterPersist();
        return;
      }
      const persisted = persistApplicationWithOutcome({
        application: resolved.application,
        outcome: resolved.outcome,
      });
      if (!persisted.ok) {
        setPersistError(persisted.error);
        return;
      }
      setPersistError(null);
      refreshAfterPersist();
    })();
  }

  function refreshAfterPersist() {
    setStorageEpoch((epoch) => epoch + 1);
  }

  function markApplicationSent() {
    if (!application) return;
    if (writeCapability === "read_only") {
      setPersistError(dashboardPersistenceFailureMessage("read_only"));
      return;
    }
    if (usesCloudPersistence) {
      const persistence = persistenceRef.current;
      if (!persistence) return;
      void transitionCloudApplicationLifecycle({
        persistence,
        application,
        linkedJob: job ?? null,
        toStatus: "applied",
      }).then((result) => {
        if (!result.ok) {
          setPersistError(cloudLifecycleFailureMessage(result));
          if (result.application) {
            setRemoteRecords({
              job: result.job ?? job ?? null,
              application: result.application,
            });
          }
          return;
        }
        setPersistError(null);
        setRemoteRecords({
          job: result.job ?? job ?? null,
          application: result.application,
        });
      });
      return;
    }
    const persisted = persistApplicationSubmitted(application);
    if (!persisted.ok) {
      setPersistError(persisted.error);
      return;
    }
    setPersistError(null);
    refreshAfterPersist();
  }

  function recordStatus(toStatus: ApplyFlowPipelineStatusV2) {
    if (!application || !canRecordApplicationOutcome(application.id, [application])) return;
    if (writeCapability === "read_only") {
      setPersistError(dashboardPersistenceFailureMessage("read_only"));
      return;
    }
    if (usesCloudPersistence) {
      const persistence = persistenceRef.current;
      if (!persistence) return;
      void transitionCloudApplicationLifecycle({
        persistence,
        application,
        linkedJob: job ?? null,
        toStatus,
        notes: feedbackNote.trim() || undefined,
      }).then((result) => {
        if (!result.ok) {
          setPersistError(cloudLifecycleFailureMessage(result));
          if (result.application) {
            setRemoteRecords({
              job: result.job ?? job ?? null,
              application: result.application,
            });
          }
          return;
        }
        setPersistError(null);
        setRemoteRecords({
          job: result.job ?? job ?? null,
          application: result.application,
        });
        setFeedbackNote(toStatus === "rejected" && !feedbackNote.trim() ? "Rejection recorded without an explicit reason (unknown)." : "");
      });
      return;
    }
    const persisted = persistApplicationStatusTransition({
      application,
      toStatus,
      notes: feedbackNote.trim() || undefined,
      rejectionReason: toStatus === "rejected" ? feedbackNote.trim() || undefined : undefined,
      source: "user",
    });
    if (!persisted.ok) {
      setPersistError(persisted.error);
      return;
    }
    setPersistError(null);
    refreshAfterPersist();
    setFeedbackNote(toStatus === "rejected" && !feedbackNote.trim() ? "Rejection recorded without an explicit reason (unknown)." : "");
  }

  if (!persistenceBootstrap.ok) {
    return <DashboardPersistenceNotice kind="bootstrap_unavailable" />;
  }

  if (remoteGate === "migration_required") {
    return (
      <DashboardMigrationPanel
        onComplete={() => {
          if (!persistenceBootstrap.ok) {
            setRemoteGate("bootstrap_unavailable");
            return;
          }
          void openDashboardPersistence({ bootstrap: persistenceBootstrap.bootstrap }).then((opened) => {
            if (opened.kind === "ready") {
              persistenceRef.current = opened.persistence;
              setUsesCloudPersistence(true);
              setWriteCapability(opened.writeCapability);
              const jobRecord = opened.jobs.find((item) => item.id === jobId) ?? null;
              setRemoteRecords({
                job: jobRecord,
                application: jobRecord
                  ? (findApplicationForJob(opened.applications, jobRecord) ?? null)
                  : null,
              });
              setRemoteGate(null);
              return;
            }
            if (
              opened.kind === "v1" ||
              opened.kind === "v2_offering_empty_pending" ||
              opened.kind === "migration_complete_pending_activation"
            ) {
              persistenceRef.current = opened.persistence;
              setUsesCloudPersistence(false);
              setWriteCapability("full");
              setRemoteRecords(null);
              setRemoteGate(null);
              setStorageEpoch((epoch) => epoch + 1);
              return;
            }
            persistenceRef.current = null;
            if (
              opened.kind === "migration_required" ||
              opened.kind === "auth_required" ||
              opened.kind === "error" ||
              opened.kind === "paused" ||
              opened.kind === "bootstrap_unavailable"
            ) {
              setRemoteGate(opened.kind);
            }
          });
        }}
      />
    );
  }

  if (remoteGate) {
    return <DashboardPersistenceNotice kind={remoteGate} />;
  }

  if (!snapshot) {
    return <ApplyFlowLoadingState label="A carregar…" />;
  }

  if (!job) {
    return (
      <ApplyFlowCard variant="muted" padding="md">
        <p className="text-sm text-[color:var(--af-text)]">{JOB_DECISION_V2_MISSING}</p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-emerald-300 hover:text-emerald-200">
          {JOB_DECISION_V2_BACK}
        </Link>
      </ApplyFlowCard>
    );
  }

  return (
    <ApplyFlowSection eyebrow={JOB_DECISION_V2_EYEBROW} title={JOB_DECISION_V2_TITLE} description={JOB_DECISION_V2_HINT}>
      <p className="text-sm font-medium text-[color:var(--af-text)]">
        {job.title}
        {job.company ? ` · ${job.company}` : ""}
      </p>
      {job.source === "remoteok" && isOpenableJobUrl(job.url) ? (
        <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
            data-testid="remoteok-analysis-attribution"
          >
            {JOB_DISCOVERY_SOURCE_REMOTEOK}
          </a>
          {" · "}
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {JOB_DISCOVERY_VIEW_LISTING_REMOTEOK}
          </a>
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <Link href="/dashboard" className="text-emerald-300 hover:text-emerald-200">
          {JOB_DECISION_V2_BACK}
        </Link>
        <Link href="/dashboard/analytics" className="text-emerald-300 hover:text-emerald-200">
          Analytics
        </Link>
      </div>

      {!decision ? (
        <ApplyFlowCard variant="warning" padding="md" className="mt-4">
          <p className="text-sm text-[color:var(--af-text)]">
            {needsResume ? JOB_DECISION_V2_NEED_RESUME : JOB_DECISION_V2_NO_TEXT}
          </p>
          {needsResume ? (
            <Link href="/dashboard" className="mt-3 inline-block text-sm text-emerald-300 hover:text-emerald-200">
              {JOB_DECISION_V2_BACK}
            </Link>
          ) : null}
        </ApplyFlowCard>
      ) : null}

      {!decision && application ? (
        <div className="mt-5 grid gap-4">
          <ApplicationOutcomeCard
            application={application}
            currentPipeline={currentPipeline}
            nextActionGuidance={nextActionGuidance}
            applicationAgeCopies={applicationAgeCopies}
            persistError={persistError}
            feedbackNote={feedbackNote}
            setFeedbackNote={setFeedbackNote}
            markApplicationSent={markApplicationSent}
            recordStatus={recordStatus}
            lifecycleEvents={lifecycleEvents}
            usesCloudPersistence={usesCloudPersistence}
            canCreate={false}
            createApplicationRecord={createApplicationRecord}
            decision={null}
          />
        </div>
      ) : null}

      {decision ? (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Career OS V2">
            {(Object.keys(JOB_DECISION_V2_TABS) as JobV2Tab[]).map((key) => (
              <ApplyFlowButton
                key={key}
                type="button"
                role="tab"
                variant={tab === key ? "outlineBrand" : "ghost"}
                size="sm"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tab === key
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-[color:var(--af-border)] text-[color:var(--af-text-muted)]"
                }`}
              >
                {JOB_DECISION_V2_TABS[key]}
              </ApplyFlowButton>
            ))}
          </div>

          {readiness ? <ApplicationReadinessBlock readiness={readiness} job={job} /> : null}

          <ApplicationOutcomeCard
            application={application}
            currentPipeline={currentPipeline}
            nextActionGuidance={nextActionGuidance}
            applicationAgeCopies={applicationAgeCopies}
            persistError={persistError}
            feedbackNote={feedbackNote}
            setFeedbackNote={setFeedbackNote}
            markApplicationSent={markApplicationSent}
            recordStatus={recordStatus}
            lifecycleEvents={lifecycleEvents}
            usesCloudPersistence={usesCloudPersistence}
            canCreate={!application}
            createApplicationRecord={createApplicationRecord}
            decision={decision}
          />

          {tab === "overview" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_CURRENT_ANALYSIS}
              </p>
              <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CURRENT_HINT}</p>
              {decision.decision === "needs_info" ? (
                <p className="mt-3 text-sm text-[color:var(--af-text)]">{JOB_DECISION_V2_INCOMPLETE}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ApplyFlowBadge tone={applicationDecisionTone(decision.decision)}>
                  {JOB_DECISION_V2_LABELS[decision.decision]}
                </ApplyFlowBadge>
                <ApplyFlowBadge tone="intel">fit {decision.overall}/100</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">risk {decision.eliminationRisk}</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">upside {decision.careerUpside}</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">hiring {decision.hiringProbability}</ApplyFlowBadge>
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-[color:var(--af-text-muted)]">
                {decision.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_DIMENSIONS}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                {dimensions.map(([label, value]) => (
                  <li key={label} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span className="tabular-nums text-[color:var(--af-text-muted)]">{value}</span>
                  </li>
                ))}
              </ul>
              {showDivergentAnalyses && registeredAnalysis ? (
                <div className="mt-4 border-t border-[color:var(--af-border)] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_AT_APPLY_ANALYSIS}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--af-text)]">
                    {registeredAnalysis.overallFit} · {JOB_DECISION_V2_LABELS[registeredAnalysis.decision]}
                  </p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_CURRENT_ANALYSIS}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--af-text)]">
                    {decision.overall} · {JOB_DECISION_V2_LABELS[decision.decision]}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_REGISTERED_PRESERVED}</p>
                </div>
              ) : registeredAnalysis ? (
                <p className="mt-4 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_REGISTERED_PRESERVED}</p>
              ) : null}
            </ApplyFlowCard>
          ) : null}

          {tab === "requirements" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_REQUIREMENTS}
              </p>
              <ul className="mt-2 grid gap-2">
                {decision.matches.map((match) => (
                  <li key={match.requirement.id} className="text-sm text-[color:var(--af-text)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <ApplyFlowBadge tone={evidenceMatchTone(match.status)}>{match.status}</ApplyFlowBadge>
                      <span>{match.requirement.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{match.reason}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_GATES}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                {(pack?.gates ?? decision.gates).map((gate) => (
                  <li key={gate.id}>
                    {gate.label}: {JOB_DECISION_V2_GATE_RESULT_LABELS[gate.result] ?? gate.result} — {gate.reason}
                  </li>
                ))}
              </ul>
            </ApplyFlowCard>
          ) : null}

          {tab === "evidence" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_CLAIMS}
              </p>
              {decision.recommendedClaims.length === 0 ? (
                <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CLAIMS_EMPTY}</p>
              ) : (
                <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                  {decision.recommendedClaims.map((item) => (
                    <li key={item.claim}>
                      {item.status}: {item.claim}
                    </li>
                  ))}
                </ul>
              )}
              {decision.candidateInputRequests.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_INPUTS}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_INPUTS_HINT}</p>
                  <ul className="mt-2 grid gap-2 text-sm text-[color:var(--af-text)]">
                    {decision.candidateInputRequests.map((item) => (
                      <li key={item.id}>
                        <p>{item.question}</p>
                        <p className="text-xs text-[color:var(--af-text-muted)]">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ApplyFlowCard>
          ) : null}

          {tab === "application" && pack ? (
            pack.status === "blocked" ? (
              <ApplyFlowCard variant="warning" padding="md">
                <p className="text-sm text-[color:var(--af-text)]">
                  {pack.decision === "needs_info" ? JOB_DECISION_V2_PACK_INCOMPLETE : JOB_DECISION_V2_PACK_BLOCKED}
                </p>
                <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{pack.reason}</p>
              </ApplyFlowCard>
            ) : (
              <div className="grid gap-4">
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Resume
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--af-text)]">
                    {pack.resumeRecommendation?.variant.name} · {pack.resumeRecommendation?.strategy}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{pack.resumeRecommendation?.reason}</p>
                  {pack.cvPersonalization?.headline ? (
                    <p className="mt-3 text-sm text-[color:var(--af-text)]">Headline: {pack.cvPersonalization.headline}</p>
                  ) : null}
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    CV plan
                  </p>
                  <ul className="mt-2 grid gap-2 text-sm text-[color:var(--af-text)]">
                    {(pack.cvPersonalization?.experienceChanges ?? []).map((item) => (
                      <li key={item.proposed}>
                        {item.claimSafety}: {item.proposed}
                      </li>
                    ))}
                  </ul>
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Answers
                  </p>
                  <ul className="mt-2 grid gap-3 text-sm text-[color:var(--af-text)]">
                    {pack.applicationAnswers.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium">{item.question}</p>
                        <p className="text-xs text-[color:var(--af-text-muted)]">{item.status}</p>
                        {item.recommendedAnswer ? <p className="mt-1">{item.recommendedAnswer}</p> : null}
                      </li>
                    ))}
                  </ul>
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Binary / claim audit
                  </p>
                  <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                    {pack.binaryQuestions.map((item) => (
                      <li key={item.id}>
                        {item.answer.toUpperCase()} — {item.question}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
                    Audit: {pack.claimAudit.safeCount} safe · {pack.claimAudit.defensibleCount} defensible ·{" "}
                    {pack.claimAudit.removedCount} removed
                  </p>
                  {pack.candidateInputs.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm text-[color:var(--af-text)]">
                      {pack.candidateInputs.map((item) => (
                        <li key={item.id}>{item.question}</li>
                      ))}
                    </ul>
                  ) : null}
                </ApplyFlowCard>
              </div>
            )
          ) : null}

          {tab === "networking" && pack ? (
            <JobDecisionV2NetworkingTab
              applicationId={application?.id}
              jobId={jobId}
              company={job.company}
              contacts={contacts}
              networkingPlan={pack.networkingPlan}
              onPersist={refreshAfterPersist}
            />
          ) : null}

          {tab === "interview" && pack ? (
            <ApplyFlowCard padding="md">
              <p className="text-sm text-[color:var(--af-text)]">{pack.interviewBrief?.decisionSummary}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Strongest evidence
              </p>
              <ul className="mt-2 grid gap-1 text-sm">
                {(pack.interviewBrief?.strongestEvidence ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Gaps
              </p>
              <ul className="mt-2 grid gap-1 text-sm">
                {(pack.interviewBrief?.gaps ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Recommended cases
              </p>
              <ul className="mt-2 grid gap-2 text-sm">
                {(pack.interviewBrief?.recommendedCases ?? []).map((item) => (
                  <li key={item.project}>
                    {item.project} · {item.score} · {item.bestFor.join(", ")}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_LAB_HANDOFF}</p>
              <a
                href={getInterviewLabImportHandoffUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
              >
                {JOB_DECISION_V2_OPEN_LAB}
              </a>
            </ApplyFlowCard>
          ) : null}
        </div>
      ) : null}
    </ApplyFlowSection>
  );
}
