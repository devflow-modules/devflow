import type { ApplicationDecision } from "./application-decision-types.js";
import { markApplicationSubmitted } from "./application-identity.js";
import { emptyOutcome, mergeOutcome } from "./application-outcome.js";
import type { ApplyFlowApplication } from "./application-types.js";
import type {
  ApplicationCareerEvent,
  ApplicationEffort,
  ApplicationLifecycleSource,
  ApplicationOutcome,
  CareerEventType,
  RejectionReasonCategory,
} from "./career-analytics-types.js";
import {
  fromPipelineStatusV2,
  isApplyFlowPipelineStatusV2,
  toPipelineStatusV2,
  type ApplyFlowPipelineStatusV2,
} from "./pipeline-status.js";

export type AnalysisAtApply = {
  score: number;
  recommendation: ApplicationDecision;
  analyzedAt: string;
};

export type CurrentAnalysisView = {
  score: number;
  recommendation: ApplicationDecision;
};

export type ApplicationLifecycleView = {
  status: ApplyFlowPipelineStatusV2;
  appliedAt?: string;
  lastActivityAt?: string;
  analysisAtApply: AnalysisAtApply | null;
  events: ApplicationCareerEvent[];
};

export type TransitionApplicationStatusInput = {
  application: ApplyFlowApplication;
  outcome?: ApplicationOutcome;
  events?: readonly ApplicationCareerEvent[];
  toStatus: ApplyFlowPipelineStatusV2;
  source?: ApplicationLifecycleSource;
  notes?: string;
  rejectionReason?: string;
  rejectionReasonCategory?: RejectionReasonCategory;
  now?: Date;
};

export type TransitionApplicationStatusResult =
  | {
      ok: true;
      unchanged: boolean;
      application: ApplyFlowApplication;
      outcome: ApplicationOutcome;
      event: ApplicationCareerEvent | null;
      events: ApplicationCareerEvent[];
    }
  | {
      ok: false;
      error: "invalid_transition";
      message: string;
      fromStatus: ApplyFlowPipelineStatusV2;
      toStatus: ApplyFlowPipelineStatusV2;
    };

export const APPLICATION_LIFECYCLE_TRANSITIONS: Record<
  ApplyFlowPipelineStatusV2,
  readonly ApplyFlowPipelineStatusV2[]
> = {
  found: ["applied", "skipped", "rejected", "withdrawn"],
  qualified: ["applied", "skipped", "rejected", "withdrawn"],
  applying: ["applied", "skipped", "rejected", "withdrawn"],
  skipped: [],
  applied: ["recruiter_contacted", "screening", "technical", "final", "offer", "rejected", "withdrawn"],
  recruiter_contacted: ["screening", "technical", "final", "offer", "rejected", "withdrawn"],
  screening: ["technical", "final", "offer", "rejected", "withdrawn"],
  technical: ["final", "offer", "rejected", "withdrawn"],
  final: ["offer", "rejected", "withdrawn"],
  offer: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

function iso(now: Date): string {
  return now.toISOString();
}

export function resolvePipelineStatus(input: {
  application: Pick<ApplyFlowApplication, "status">;
  outcome?: Pick<ApplicationOutcome, "finalStatus"> | null;
}): ApplyFlowPipelineStatusV2 {
  if (input.outcome?.finalStatus && isApplyFlowPipelineStatusV2(input.outcome.finalStatus)) {
    return input.outcome.finalStatus;
  }
  return toPipelineStatusV2(input.application.status);
}

export function canTransitionApplicationStatus(
  fromStatus: ApplyFlowPipelineStatusV2,
  toStatus: ApplyFlowPipelineStatusV2,
): boolean {
  if (fromStatus === toStatus) return true;
  return APPLICATION_LIFECYCLE_TRANSITIONS[fromStatus].includes(toStatus);
}

export function analysisAtApplyFromOutcome(outcome?: ApplicationOutcome | null): AnalysisAtApply | null {
  if (outcome?.snapshot) {
    return {
      score: outcome.snapshot.overallFit,
      recommendation: outcome.snapshot.decision,
      analyzedAt: outcome.snapshot.capturedAt,
    };
  }
  if (typeof outcome?.fitAtApplication === "number" && outcome.decisionAtApplication) {
    return {
      score: outcome.fitAtApplication,
      recommendation: outcome.decisionAtApplication,
      analyzedAt: outcome.createdAt,
    };
  }
  return null;
}

export function analysesDiverge(atApply: AnalysisAtApply | null, current: CurrentAnalysisView | null): boolean {
  if (!atApply || !current) return false;
  return atApply.score !== current.score || atApply.recommendation !== current.recommendation;
}

export function formatLifecycleEventDate(isoStamp: string): string {
  const parts = isoStamp.slice(0, 10).split("-");
  if (parts.length !== 3) return isoStamp;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function eventTypeForStatus(toStatus: ApplyFlowPipelineStatusV2): CareerEventType {
  if (toStatus === "applied") return "applied";
  if (toStatus === "recruiter_contacted") return "response";
  if (toStatus === "screening") return "screening";
  if (toStatus === "technical") return "technical";
  if (toStatus === "final") return "final";
  if (toStatus === "offer") return "offer";
  if (toStatus === "hired") return "hired";
  if (toStatus === "rejected") return "rejection";
  if (toStatus === "withdrawn") return "withdrawal";
  return "status_changed";
}

export function lifecycleEventId(input: {
  applicationId: string;
  type: CareerEventType;
  toStatus: ApplyFlowPipelineStatusV2;
  occurredAt: string;
}): string {
  return `evt-${input.applicationId}-${input.type}-${input.toStatus}-${input.occurredAt}`;
}

function timestampsForStatus(
  toStatus: ApplyFlowPipelineStatusV2,
  occurredAt: string,
  base: ApplicationOutcome,
): Partial<ApplicationOutcome> {
  if (toStatus === "applied") return { appliedAt: base.appliedAt ?? occurredAt };
  if (toStatus === "recruiter_contacted") return { firstResponseAt: base.firstResponseAt ?? occurredAt };
  if (toStatus === "screening") {
    return {
      screeningAt: occurredAt,
      firstResponseAt: base.firstResponseAt ?? occurredAt,
    };
  }
  if (toStatus === "technical") return { technicalAt: occurredAt };
  if (toStatus === "final") return { finalInterviewAt: occurredAt };
  if (toStatus === "offer") return { offerAt: occurredAt };
  if (toStatus === "hired") return { hiredAt: base.hiredAt ?? occurredAt };
  if (toStatus === "rejected") return { rejectedAt: occurredAt };
  if (toStatus === "withdrawn") return { withdrawnAt: occurredAt };
  return {};
}

export function getApplicationLifecycleView(input: {
  application: ApplyFlowApplication;
  outcome?: ApplicationOutcome | null;
  events?: readonly ApplicationCareerEvent[];
}): ApplicationLifecycleView {
  const status = resolvePipelineStatus(input);
  const events = (input.events ?? [])
    .filter((item) => item.applicationId === input.application.id)
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return {
    status,
    ...(input.outcome?.appliedAt ? { appliedAt: input.outcome.appliedAt } : {}),
    ...(input.outcome?.lastActivityAt ? { lastActivityAt: input.outcome.lastActivityAt } : {}),
    analysisAtApply: analysisAtApplyFromOutcome(input.outcome),
    events,
  };
}

export function transitionApplicationStatus(
  input: TransitionApplicationStatusInput,
): TransitionApplicationStatusResult {
  const now = input.now ?? new Date();
  const occurredAt = iso(now);
  const fromStatus = resolvePipelineStatus({ application: input.application, outcome: input.outcome });
  const toStatus = input.toStatus;

  if (!canTransitionApplicationStatus(fromStatus, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Transition ${fromStatus} → ${toStatus} is not allowed.`,
      fromStatus,
      toStatus,
    };
  }

  const base = input.outcome ?? emptyOutcome(input.application.id, now);
  const existingEvents = input.events ?? [];

  if (fromStatus === toStatus) {
    return {
      ok: true,
      unchanged: true,
      application: input.application,
      outcome: base,
      event: null,
      events: [...existingEvents],
    };
  }

  const eventType = eventTypeForStatus(toStatus);
  const event: ApplicationCareerEvent = {
    id: lifecycleEventId({
      applicationId: input.application.id,
      type: eventType,
      toStatus,
      occurredAt,
    }),
    applicationId: input.application.id,
    type: eventType,
    occurredAt,
    fromStatus,
    toStatus,
    source: input.source ?? "user",
    ...(input.notes ? { notes: input.notes } : {}),
  };

  if (existingEvents.some((item) => item.id === event.id)) {
    return {
      ok: true,
      unchanged: true,
      application: input.application,
      outcome: base,
      event: null,
      events: [...existingEvents],
    };
  }

  let application = input.application;
  if (toStatus === "applied") {
    application = markApplicationSubmitted(application, now);
  } else {
    application = {
      ...application,
      status: fromPipelineStatusV2(toStatus),
      updatedAt: occurredAt,
    };
  }

  const patch: Partial<ApplicationOutcome> = {
    ...timestampsForStatus(toStatus, occurredAt, base),
    finalStatus: toStatus,
    lastActivityAt: occurredAt,
    ...(toStatus === "rejected"
      ? {
          rejectionReason: input.rejectionReason,
          rejectionReasonCategory: input.rejectionReasonCategory ?? "unknown",
          rejectionReasonSource: input.rejectionReason ? "explicit" : "unknown",
        }
      : {}),
  };

  return {
    ok: true,
    unchanged: false,
    application,
    outcome: mergeOutcome(base, patch, now),
    event,
    events: [...existingEvents, event],
  };
}

function laterIso(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return left >= right ? left : right;
}

function laterOf(...values: Array<string | undefined>): string | undefined {
  return values.reduce<string | undefined>((acc, value) => laterIso(acc, value), undefined);
}

function hasAppliedEvent(events: readonly ApplicationCareerEvent[], applicationId: string): boolean {
  return events.some(
    (item) => item.applicationId === applicationId && (item.type === "applied" || item.toStatus === "applied"),
  );
}

/**
 * Additive backfill for existing applied records. Never rewrites snapshots or recommendations.
 */
export function backfillClosedLoopV1(input: {
  applications: readonly ApplyFlowApplication[];
  outcomes: readonly ApplicationOutcome[];
  events: readonly ApplicationCareerEvent[];
  efforts?: readonly ApplicationEffort[];
  now?: Date;
}): {
  outcomes: ApplicationOutcome[];
  events: ApplicationCareerEvent[];
  efforts: ApplicationEffort[];
  changed: boolean;
} {
  const now = input.now ?? new Date();
  const outcomes = input.outcomes.map((item) => ({ ...item }));
  const events = [...input.events];
  const efforts = [...(input.efforts ?? [])];
  let changed = false;

  for (const application of input.applications) {
    const pipeline = toPipelineStatusV2(application.status);
    const postApply =
      pipeline === "applied" ||
      pipeline === "recruiter_contacted" ||
      pipeline === "screening" ||
      pipeline === "technical" ||
      pipeline === "final" ||
      pipeline === "offer" ||
      pipeline === "hired" ||
      pipeline === "rejected" ||
      pipeline === "withdrawn";
    if (!postApply) continue;

    const index = outcomes.findIndex((item) => item.applicationId === application.id);
    const base = index >= 0 ? outcomes[index]! : emptyOutcome(application.id, now);
    const appliedAt = base.appliedAt ?? application.updatedAt;
    const lastActivityAt =
      laterOf(
        base.lastActivityAt,
        appliedAt,
        base.firstResponseAt,
        base.screeningAt,
        base.technicalAt,
        base.finalInterviewAt,
        base.offerAt,
        base.hiredAt,
        base.rejectedAt,
        base.withdrawnAt,
        application.updatedAt,
      ) ?? iso(now);

    const nextOutcome = mergeOutcome(
      base,
      {
        ...(appliedAt && !base.appliedAt ? { appliedAt } : {}),
        ...(base.lastActivityAt ? {} : { lastActivityAt }),
        ...(base.finalStatus ? {} : { finalStatus: pipeline }),
      },
      now,
    );

    const snapshotUnchanged =
      nextOutcome.snapshot === base.snapshot &&
      nextOutcome.fitAtApplication === base.fitAtApplication &&
      nextOutcome.decisionAtApplication === base.decisionAtApplication;

    if (!snapshotUnchanged) {
      continue;
    }

    const outcomeChanged =
      nextOutcome.appliedAt !== base.appliedAt ||
      nextOutcome.lastActivityAt !== base.lastActivityAt ||
      nextOutcome.finalStatus !== base.finalStatus;

    if (index >= 0) {
      if (outcomeChanged) {
        outcomes[index] = nextOutcome;
        changed = true;
      }
    } else {
      outcomes.push(nextOutcome);
      changed = true;
    }

    if (appliedAt && !hasAppliedEvent(events, application.id)) {
      events.push({
        id: lifecycleEventId({
          applicationId: application.id,
          type: "applied",
          toStatus: "applied",
          occurredAt: appliedAt,
        }),
        applicationId: application.id,
        type: "applied",
        occurredAt: appliedAt,
        toStatus: "applied",
        source: "backfill",
      });
      changed = true;
    }

    if (appliedAt) {
      const effortIndex = efforts.findIndex((item) => item.applicationId === application.id);
      if (effortIndex >= 0) {
        if (!efforts[effortIndex]!.applicationSubmittedAt) {
          efforts[effortIndex] = { ...efforts[effortIndex]!, applicationSubmittedAt: appliedAt };
          changed = true;
        }
      } else {
        efforts.push({ applicationId: application.id, applicationSubmittedAt: appliedAt });
        changed = true;
      }
    }
  }

  return { outcomes, events, efforts, changed };
}
