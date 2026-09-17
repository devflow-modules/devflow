import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import type { ApplyFlowApplication } from "./application-types.js";
import type { Contact, ContactInteraction } from "./contact-types.js";
import { toPipelineStatusV2 } from "./pipeline-status.js";
import type {
  ApplicationCareerEvent,
  ApplicationOutcome,
  CareerFeedbackAction,
  CareerSource,
  RejectionReasonCategory,
  RejectionReasonSource,
} from "./career-analytics-types.js";
import { normalizeCareerSource } from "./career-analytics-normalize.js";

function iso(now: Date): string {
  return now.toISOString();
}

export function emptyOutcome(applicationId: string, now: Date): ApplicationOutcome {
  const stamp = iso(now);
  return {
    applicationId,
    rejectionReasonCategory: "unknown",
    rejectionReasonSource: "unknown",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function applySnapshotToOutcome(outcome: ApplicationOutcome): ApplicationOutcome {
  const snapshot = outcome.snapshot;
  if (!snapshot) return outcome;
  return {
    ...outcome,
    fitAtApplication: snapshot.overallFit,
    decisionAtApplication: snapshot.decision,
    priorityAtApplication: snapshot.priority,
    resumeVariant: snapshot.resumeVariant ?? outcome.resumeVariant,
  };
}

export function mergeOutcome(base: ApplicationOutcome, patch: Partial<ApplicationOutcome>, now: Date): ApplicationOutcome {
  const { snapshot: incomingSnapshot, applicationId: _applicationId, createdAt: _createdAt, ...rest } = patch;
  const snapshot = base.snapshot ?? incomingSnapshot;
  const merged: ApplicationOutcome = {
    ...base,
    ...rest,
    applicationId: base.applicationId,
    createdAt: base.createdAt,
    snapshot,
    appliedAt: base.appliedAt ?? rest.appliedAt,
    hiredAt: base.hiredAt ?? rest.hiredAt,
    fitAtApplication: snapshot?.overallFit ?? base.fitAtApplication ?? rest.fitAtApplication,
    decisionAtApplication: snapshot?.decision ?? base.decisionAtApplication ?? rest.decisionAtApplication,
    priorityAtApplication: snapshot?.priority ?? base.priorityAtApplication ?? rest.priorityAtApplication,
    resumeVariant: snapshot?.resumeVariant ?? base.resumeVariant ?? rest.resumeVariant,
    updatedAt: iso(now),
  };
  return applySnapshotToOutcome(merged);
}

export function outcomeFromApplication(
  application: ApplyFlowApplicationV2Envelope,
  extras?: {
    contacts?: readonly Contact[];
    interactions?: readonly ContactInteraction[];
    careerSource?: CareerSource;
  },
): ApplicationOutcome {
  const sourceJobId = application.v2?.sourceJobId;
  const contacts = (extras?.contacts ?? []).filter((item) => sourceJobId != null && item.jobId === sourceJobId);
  const interactions = (extras?.interactions ?? []).filter(
    (item) => (sourceJobId != null && item.jobId === sourceJobId) || contacts.some((contact) => contact.id === item.contactId),
  );
  const networkingUsed = contacts.length > 0 || interactions.length > 0 || application.v2?.networkingStatus != null;
  return {
    applicationId: application.id,
    finalStatus: toPipelineStatusV2(application.status),
    source: extras?.careerSource ?? normalizeCareerSource(application.jobUrl ?? application.source),
    resumeVariant: application.v2?.resumeVariant ?? application.resumeTrack,
    networkingUsed,
    contactsCount: contacts.length,
    fitAtApplication: application.v2?.priority != null || application.fitScore != null ? application.fitScore : application.fitScore,
    decisionAtApplication: application.v2?.decision,
    priorityAtApplication: application.v2?.priority,
    rejectionReasonCategory: application.status === "rejected" ? "unknown" : undefined,
    rejectionReasonSource: application.status === "rejected" ? "unknown" : undefined,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export function resolvedRejection(outcome: ApplicationOutcome): {
  category: RejectionReasonCategory;
  source: RejectionReasonSource;
} {
  if (!outcome.rejectedAt && outcome.finalStatus !== "rejected") {
    return { category: "unknown", source: "unknown" };
  }
  if (outcome.rejectionReasonSource === "explicit" && outcome.rejectionReasonCategory) {
    return { category: outcome.rejectionReasonCategory, source: "explicit" };
  }
  if (outcome.rejectionReasonSource === "candidate_inference" && outcome.rejectionReasonCategory) {
    return { category: outcome.rejectionReasonCategory, source: "candidate_inference" };
  }
  return { category: "unknown", source: "unknown" };
}

export function applyCareerFeedback(input: {
  application: ApplyFlowApplication;
  outcome?: ApplicationOutcome;
  action: CareerFeedbackAction;
  occurredAt?: string;
  rejectionReason?: string;
  rejectionReasonCategory?: RejectionReasonCategory;
  notes?: string;
  now?: Date;
}): { outcome: ApplicationOutcome; event: ApplicationCareerEvent } {
  const now = input.now ?? new Date();
  if (input.outcome && input.outcome.applicationId !== input.application.id) {
    throw new Error("Outcome belongs to applicationId, not jobId.");
  }
  const occurredAt = input.occurredAt ?? iso(now);
  const base = input.outcome ?? emptyOutcome(input.application.id, now);
  const eventType =
    input.action === "response_received"
      ? "response"
      : input.action === "withdrawal"
        ? "withdrawal"
        : input.action;
  const event: ApplicationCareerEvent = {
    id: `evt-${input.application.id}-${eventType}-${occurredAt}`,
    applicationId: input.application.id,
    type: eventType,
    occurredAt,
    ...(input.notes ? { notes: input.notes } : {}),
  };

  let patch: Partial<ApplicationOutcome> = {};
  if (input.action === "response_received") patch = { firstResponseAt: base.firstResponseAt ?? occurredAt };
  if (input.action === "screening") patch = { screeningAt: occurredAt, firstResponseAt: base.firstResponseAt ?? occurredAt };
  if (input.action === "technical") patch = { technicalAt: occurredAt };
  if (input.action === "final") patch = { finalInterviewAt: occurredAt };
  if (input.action === "offer") patch = { offerAt: occurredAt, finalStatus: "offer" };
  if (input.action === "withdrawal") patch = { withdrawnAt: occurredAt, finalStatus: "withdrawn" };
  if (input.action === "rejection") {
    patch = {
      rejectedAt: occurredAt,
      finalStatus: "rejected",
      rejectionReason: input.rejectionReason,
      rejectionReasonCategory: input.rejectionReasonCategory ?? "unknown",
      rejectionReasonSource: input.rejectionReason ? "explicit" : "unknown",
    };
  }

  return { outcome: mergeOutcome(base, patch, now), event };
}
