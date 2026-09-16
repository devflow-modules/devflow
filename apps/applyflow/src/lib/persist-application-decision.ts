import {
  backfillClosedLoopV1,
  emptyOutcome,
  formatInboundConfirmationNotes,
  fromPipelineStatusV2,
  lifecycleEventId,
  markApplyFlowJobApplied,
  markResponseDetectionConfirmed,
  markResponseDetectionDismissed,
  mergeInboundResponseDetections,
  mergeOutcome,
  prepareResponseDetectionConfirmation,
  transitionApplicationStatus,
  type ApplicationCareerEvent,
  type ApplicationLifecycleSource,
  type ApplicationOutcome,
  type ApplyFlowApplication,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowPipelineStatusV2,
  type ResponseDetection,
  type RejectionReasonCategory,
} from "@devflow/applyflow-core";

import { loadDashboardAnalytics, persistDashboardAnalytics, upsertAnalyticsOutcome } from "./local-analytics-storage";
import { loadDashboardImport, persistDashboardImport, upsertDashboardApplication } from "./local-import-storage";
import {
  loadDashboardInboundResponses,
  persistDashboardInboundResponses,
} from "./local-inbound-response-storage";
import { loadDashboardJobs, persistDashboardJobs } from "./local-job-storage";

export function persistApplicationWithOutcome(input: {
  application: ApplyFlowApplication;
  outcome: ApplicationOutcome;
}): { ok: true } | { ok: false; error: string } {
  if (input.outcome.applicationId !== input.application.id) {
    return { ok: false, error: "Outcome applicationId must match Application.id." };
  }
  const previousApps = loadDashboardImport()?.applications ?? [];
  const previousAnalytics = loadDashboardAnalytics();
  if (previousAnalytics.status === "unreadable") {
    return { ok: false, error: "Analytics storage is unreadable; candidatura não foi gravada." };
  }

  try {
    upsertDashboardApplication(input.application);
    upsertAnalyticsOutcome(input.outcome);
  } catch {
    restorePrevious(previousApps, previousAnalytics);
    return { ok: false, error: "Falha ao gravar candidatura e outcome. Estado anterior restaurado." };
  }

  const apps = loadDashboardImport()?.applications ?? [];
  const analytics = loadDashboardAnalytics();
  const hasApp = apps.some((item) => item.id === input.application.id);
  const hasOutcome = analytics.outcomes.some(
    (item) => item.applicationId === input.application.id && Boolean(item.snapshot ?? input.outcome.snapshot),
  );
  if (!hasApp || !hasOutcome || analytics.status === "unreadable") {
    restorePrevious(previousApps, previousAnalytics);
    return { ok: false, error: "Gravação incompleta. Estado anterior restaurado." };
  }
  return { ok: true };
}

export function persistApplicationStatusTransition(input: {
  application: ApplyFlowApplication;
  toStatus: ApplyFlowPipelineStatusV2;
  source?: ApplicationLifecycleSource;
  notes?: string;
  rejectionReason?: string;
  rejectionReasonCategory?: RejectionReasonCategory;
  now?: Date;
}):
  | { ok: true; application: ApplyFlowApplication; unchanged: boolean }
  | { ok: false; error: string } {
  const previousApps = loadDashboardImport()?.applications ?? [];
  const previousAnalytics = loadDashboardAnalytics();
  const previousJobs = loadDashboardJobs();
  if (previousAnalytics.status === "unreadable") {
    return { ok: false, error: "Analytics storage is unreadable; estágio não foi actualizado." };
  }

  const currentOutcome = previousAnalytics.outcomes.find((item) => item.applicationId === input.application.id);
  const transitioned = transitionApplicationStatus({
    application: input.application,
    outcome: currentOutcome,
    events: previousAnalytics.events.filter((item) => item.applicationId === input.application.id),
    toStatus: input.toStatus,
    source: input.source ?? "user",
    notes: input.notes,
    rejectionReason: input.rejectionReason,
    rejectionReasonCategory: input.rejectionReasonCategory,
    now: input.now,
  });

  if (!transitioned.ok) {
    return { ok: false, error: transitioned.message };
  }

  if (transitioned.unchanged) {
    return { ok: true, application: transitioned.application, unchanged: true };
  }

  try {
    upsertDashboardApplication(transitioned.application);
    upsertAnalyticsOutcome(transitioned.outcome, transitioned.event ?? undefined);
    if (input.toStatus === "applied") {
      const efforts = previousAnalytics.efforts.some((item) => item.applicationId === transitioned.application.id)
        ? previousAnalytics.efforts.map((item) =>
            item.applicationId === transitioned.application.id
              ? { ...item, applicationSubmittedAt: item.applicationSubmittedAt ?? transitioned.outcome.appliedAt }
              : item,
          )
        : [
            ...previousAnalytics.efforts,
            {
              applicationId: transitioned.application.id,
              applicationSubmittedAt: transitioned.outcome.appliedAt,
            },
          ];
      const analytics = loadDashboardAnalytics();
      persistDashboardAnalytics(analytics.outcomes, analytics.events, efforts);
    }
    syncLinkedJobStatus(transitioned.application, input.toStatus, previousJobs.jobs);
  } catch {
    restorePrevious(previousApps, previousAnalytics);
    try {
      persistDashboardJobs(previousJobs.jobs);
    } catch {
      /* reported as persist failure */
    }
    return { ok: false, error: "Falha ao actualizar o estágio. Estado anterior restaurado." };
  }

  return { ok: true, application: transitioned.application, unchanged: false };
}

export function persistApplicationSubmitted(
  application: ApplyFlowApplication,
): { ok: true; application: ApplyFlowApplication } | { ok: false; error: string } {
  return persistApplicationStatusTransition({ application, toStatus: "applied", source: "user" });
}

export function persistClosedLoopV1Backfill(
  now = new Date(),
): { ok: true; changed: boolean } | { ok: false; error: string } {
  const applications = loadDashboardImport()?.applications ?? [];
  const analytics = loadDashboardAnalytics();
  if (analytics.status === "unreadable") {
    return { ok: false, error: "Analytics storage is unreadable; backfill não foi aplicado." };
  }
  const next = backfillClosedLoopV1({
    applications,
    outcomes: analytics.outcomes,
    events: analytics.events,
    efforts: analytics.efforts,
    now,
  });
  if (!next.changed) return { ok: true, changed: false };
  try {
    persistDashboardAnalytics(next.outcomes, next.events, next.efforts);
  } catch {
    return { ok: false, error: "Falha ao gravar backfill Closed Loop V1." };
  }
  return { ok: true, changed: true };
}

export function persistInboundResponseConfirmation(input: {
  application: ApplyFlowApplication;
  detection: ResponseDetection;
  selectedApplicationId?: string;
  toStatus?: ApplyFlowPipelineStatusV2 | null;
  now?: Date;
}):
  | { ok: true; application: ApplyFlowApplication; unchanged: boolean; event: ApplicationCareerEvent | null; detection: ResponseDetection }
  | { ok: false; error: string } {
  if (input.detection.autoApply !== false) {
    return { ok: false, error: "Inbound confirmation refused automatic apply." };
  }

  const storedDetections = loadDashboardInboundResponses();
  if (storedDetections.status === "unreadable") {
    return { ok: false, error: "Armazenamento de respostas está ilegível." };
  }
  const currentDetection =
    storedDetections.detections.find((item) => item.emailId === input.detection.emailId) ?? input.detection;
  if (currentDetection.state === "confirmed") {
    return {
      ok: true,
      application: input.application,
      unchanged: true,
      event: null,
      detection: currentDetection,
    };
  }

  const now = input.now ?? new Date();
  const previousAnalytics = loadDashboardAnalytics();
  if (previousAnalytics.status === "unreadable") {
    return { ok: false, error: "Analytics storage is unreadable; confirmação não foi gravada." };
  }

  const prepared = prepareResponseDetectionConfirmation({
    detection: input.detection,
    applications: [input.application],
    outcomes: previousAnalytics.outcomes,
    selectedApplicationId: input.selectedApplicationId ?? input.application.id,
    selectedStatus: input.toStatus,
  });
  if (!prepared.ok) {
    return { ok: false, error: prepared.message };
  }

  const notes = formatInboundConfirmationNotes({
    ...input.detection,
    suggestedStatus: prepared.toStatus,
    pipelineChange: prepared.pipelineChange,
    fromStatus: prepared.fromStatus,
  });

  if (!prepared.pipelineChange || !prepared.toStatus) {
    const previousApps = loadDashboardImport()?.applications ?? [];
    const occurredAt = now.toISOString();
    const event: ApplicationCareerEvent = {
      id: lifecycleEventId({
        applicationId: input.application.id,
        type: "note",
        toStatus: prepared.fromStatus,
        occurredAt,
      }),
      applicationId: input.application.id,
      type: "note",
      occurredAt,
      notes,
      fromStatus: prepared.fromStatus,
      toStatus: prepared.fromStatus,
      source: "user",
    };
    if (previousAnalytics.events.some((item) => item.id === event.id)) {
      const detection = markResponseDetectionConfirmed(currentDetection, event.id);
      persistDashboardInboundResponses(
        mergeInboundResponseDetections(storedDetections.detections, [detection]),
      );
      return { ok: true, application: input.application, unchanged: true, event: null, detection };
    }
    const base =
      previousAnalytics.outcomes.find((item) => item.applicationId === input.application.id) ??
      emptyOutcome(input.application.id, now);
    try {
      upsertAnalyticsOutcome(mergeOutcome(base, { lastActivityAt: occurredAt }, now), event);
      const detection = markResponseDetectionConfirmed(currentDetection, event.id);
      persistDashboardInboundResponses(
        mergeInboundResponseDetections(storedDetections.detections, [detection]),
      );
    } catch {
      restorePrevious(previousApps, previousAnalytics);
      return { ok: false, error: "Falha ao gravar a confirmação. Estado anterior restaurado." };
    }
    return { ok: true, application: input.application, unchanged: true, event, detection: markResponseDetectionConfirmed(currentDetection, event.id) };
  }

  const persisted = persistApplicationStatusTransition({
    application: input.application,
    toStatus: prepared.toStatus,
    source: "user",
    notes,
    rejectionReason: prepared.toStatus === "rejected" ? notes : undefined,
    now,
  });
  if (!persisted.ok) return persisted;
  const analytics = loadDashboardAnalytics();
  const event =
    analytics.events
      .filter((item) => item.applicationId === persisted.application.id)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .at(-1) ?? null;
  const detection = markResponseDetectionConfirmed(currentDetection, event?.id);
  persistDashboardInboundResponses(mergeInboundResponseDetections(storedDetections.detections, [detection]));
  return {
    ok: true,
    application: persisted.application,
    unchanged: persisted.unchanged,
    event,
    detection,
  };
}

export function persistInboundResponseDismissal(detection: ResponseDetection): { ok: true; detection: ResponseDetection } | { ok: false; error: string } {
  const stored = loadDashboardInboundResponses();
  if (stored.status === "unreadable") {
    return { ok: false, error: "Armazenamento de respostas está ilegível." };
  }
  const dismissed = markResponseDetectionDismissed(detection);
  persistDashboardInboundResponses(mergeInboundResponseDetections(stored.detections, [dismissed]));
  return { ok: true, detection: dismissed };
}

function syncLinkedJobStatus(
  application: ApplyFlowApplication,
  toStatus: ApplyFlowPipelineStatusV2,
  jobs: ReturnType<typeof loadDashboardJobs>["jobs"],
): void {
  const sourceJobId = (application as ApplyFlowApplicationV2Envelope).v2?.sourceJobId;
  if (!sourceJobId) return;
  const linked = jobs.find((job) => job.id === sourceJobId);
  if (!linked) return;
  const nextStatus = fromPipelineStatusV2(toStatus);
  if (linked.status === nextStatus) return;
  persistDashboardJobs(
    jobs.map((job) => {
      if (job.id !== sourceJobId) return job;
      if (toStatus === "applied") return markApplyFlowJobApplied(job);
      return { ...job, status: nextStatus, updatedAt: new Date().toISOString() };
    }),
  );
}

function restorePrevious(
  previousApps: Parameters<typeof persistDashboardImport>[0],
  previousAnalytics: ReturnType<typeof loadDashboardAnalytics>,
): void {
  try {
    persistDashboardImport(previousApps);
  } catch {
    /* keep trying the analytics restore */
  }
  try {
    persistDashboardAnalytics(previousAnalytics.outcomes, previousAnalytics.events, previousAnalytics.efforts);
  } catch {
    /* reported as persist failure to the caller */
  }
}
