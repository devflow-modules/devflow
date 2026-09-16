import {
  applySnapshotToOutcome,
  parseApplicationDecisionSnapshot,
  type ApplicationCareerEvent,
  type ApplicationEffort,
  type ApplicationOutcome,
} from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY = "APPLYFLOW_DASHBOARD_ANALYTICS_V1" as const;
export const DASHBOARD_ANALYTICS_STORAGE_VERSION = 1 as const;

export type DashboardStoredAnalytics = {
  version: typeof DASHBOARD_ANALYTICS_STORAGE_VERSION;
  savedAt: string;
  outcomes: ApplicationOutcome[];
  events: ApplicationCareerEvent[];
  efforts: ApplicationEffort[];
};

export type DashboardAnalyticsLoadResult = {
  outcomes: ApplicationOutcome[];
  events: ApplicationCareerEvent[];
  efforts: ApplicationEffort[];
  status: "empty" | "ok" | "unreadable";
};

function empty(): DashboardAnalyticsLoadResult {
  return { outcomes: [], events: [], efforts: [], status: "empty" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeOutcome(raw: unknown): ApplicationOutcome | null {
  if (!isRecord(raw) || typeof raw.applicationId !== "string") return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  const snapshot = parseApplicationDecisionSnapshot(raw.snapshot);
  const outcome: ApplicationOutcome = {
    applicationId: raw.applicationId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...(typeof raw.fitAtApplication === "number" ? { fitAtApplication: raw.fitAtApplication } : {}),
    ...(typeof raw.decisionAtApplication === "string"
      ? { decisionAtApplication: raw.decisionAtApplication as ApplicationOutcome["decisionAtApplication"] }
      : {}),
    ...(typeof raw.priorityAtApplication === "number" ? { priorityAtApplication: raw.priorityAtApplication } : {}),
    ...(typeof raw.resumeVariant === "string" ? { resumeVariant: raw.resumeVariant } : {}),
    ...(typeof raw.screeningAt === "string" ? { screeningAt: raw.screeningAt } : {}),
    ...(typeof raw.firstResponseAt === "string" ? { firstResponseAt: raw.firstResponseAt } : {}),
    ...(typeof raw.technicalAt === "string" ? { technicalAt: raw.technicalAt } : {}),
    ...(typeof raw.finalInterviewAt === "string" ? { finalInterviewAt: raw.finalInterviewAt } : {}),
    ...(typeof raw.offerAt === "string" ? { offerAt: raw.offerAt } : {}),
    ...(typeof raw.hiredAt === "string" ? { hiredAt: raw.hiredAt } : {}),
    ...(typeof raw.appliedAt === "string" ? { appliedAt: raw.appliedAt } : {}),
    ...(typeof raw.lastActivityAt === "string" ? { lastActivityAt: raw.lastActivityAt } : {}),
    ...(typeof raw.rejectedAt === "string" ? { rejectedAt: raw.rejectedAt } : {}),
    ...(typeof raw.withdrawnAt === "string" ? { withdrawnAt: raw.withdrawnAt } : {}),
    ...(typeof raw.finalStatus === "string" ? { finalStatus: raw.finalStatus as ApplicationOutcome["finalStatus"] } : {}),
    ...(typeof raw.rejectionReason === "string" ? { rejectionReason: raw.rejectionReason } : {}),
    ...(typeof raw.rejectionReasonCategory === "string"
      ? { rejectionReasonCategory: raw.rejectionReasonCategory as ApplicationOutcome["rejectionReasonCategory"] }
      : {}),
    ...(typeof raw.rejectionReasonSource === "string"
      ? { rejectionReasonSource: raw.rejectionReasonSource as ApplicationOutcome["rejectionReasonSource"] }
      : {}),
    ...(typeof raw.source === "string" ? { source: raw.source as ApplicationOutcome["source"] } : {}),
    ...(typeof raw.resumeStrategy === "string" ? { resumeStrategy: raw.resumeStrategy } : {}),
    ...(typeof raw.networkingUsed === "boolean" ? { networkingUsed: raw.networkingUsed } : {}),
    ...(typeof raw.contactsCount === "number" ? { contactsCount: raw.contactsCount } : {}),
    ...(snapshot ? { snapshot } : {}),
  };
  return applySnapshotToOutcome(outcome);
}

function sanitizeEvent(raw: unknown): ApplicationCareerEvent | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.applicationId !== "string") return null;
  if (typeof raw.occurredAt !== "string" || typeof raw.type !== "string") return null;
  return {
    id: raw.id,
    applicationId: raw.applicationId,
    type: raw.type as ApplicationCareerEvent["type"],
    occurredAt: raw.occurredAt,
    ...(typeof raw.notes === "string" ? { notes: raw.notes } : {}),
    ...(typeof raw.fromStatus === "string"
      ? { fromStatus: raw.fromStatus as ApplicationCareerEvent["fromStatus"] }
      : {}),
    ...(typeof raw.toStatus === "string" ? { toStatus: raw.toStatus as ApplicationCareerEvent["toStatus"] } : {}),
    ...(typeof raw.source === "string" ? { source: raw.source as ApplicationCareerEvent["source"] } : {}),
  };
}

function sanitizeEffort(raw: unknown): ApplicationEffort | null {
  if (!isRecord(raw) || typeof raw.applicationId !== "string") return null;
  return {
    applicationId: raw.applicationId,
    ...(typeof raw.applicationStartedAt === "string" ? { applicationStartedAt: raw.applicationStartedAt } : {}),
    ...(typeof raw.applicationSubmittedAt === "string" ? { applicationSubmittedAt: raw.applicationSubmittedAt } : {}),
    ...(typeof raw.personalizationMinutes === "number" ? { personalizationMinutes: raw.personalizationMinutes } : {}),
    ...(typeof raw.networkingMinutes === "number" ? { networkingMinutes: raw.networkingMinutes } : {}),
    ...(typeof raw.interviewPrepMinutes === "number" ? { interviewPrepMinutes: raw.interviewPrepMinutes } : {}),
  };
}

function sanitizeList<T>(raw: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw.map(parse).filter((item): item is T => item != null);
  if (raw.length > 0 && out.length === 0) return null;
  return out;
}

export function loadDashboardAnalytics(): DashboardAnalyticsLoadResult {
  if (typeof window === "undefined") return empty();
  const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY);
  if (!raw) return empty();
  try {
    const data = JSON.parse(raw) as DashboardStoredAnalytics;
    if (data.version !== DASHBOARD_ANALYTICS_STORAGE_VERSION) {
      return { outcomes: [], events: [], efforts: [], status: "unreadable" };
    }
    const outcomes = sanitizeList(data.outcomes, sanitizeOutcome);
    const events = sanitizeList(data.events ?? [], sanitizeEvent);
    const efforts = sanitizeList(data.efforts ?? [], sanitizeEffort);
    if (!outcomes || !events || !efforts) {
      return { outcomes: [], events: [], efforts: [], status: "unreadable" };
    }
    return { outcomes, events, efforts, status: "ok" };
  } catch {
    return { outcomes: [], events: [], efforts: [], status: "unreadable" };
  }
}

export function persistDashboardAnalytics(
  outcomes: ApplicationOutcome[],
  events: ApplicationCareerEvent[],
  efforts: ApplicationEffort[],
): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredAnalytics = {
    version: DASHBOARD_ANALYTICS_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    outcomes,
    events,
    efforts,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY, JSON.stringify(doc));
}

export function upsertAnalyticsOutcome(outcome: ApplicationOutcome, event?: ApplicationCareerEvent): void {
  const current = loadDashboardAnalytics();
  if (current.status === "unreadable") return;
  const previous = current.outcomes.find((item) => item.applicationId === outcome.applicationId);
  const nextOutcome = applySnapshotToOutcome({
    ...outcome,
    snapshot: previous?.snapshot ?? outcome.snapshot,
    appliedAt: previous?.appliedAt ?? outcome.appliedAt,
    hiredAt: previous?.hiredAt ?? outcome.hiredAt,
    fitAtApplication: previous?.snapshot?.overallFit ?? previous?.fitAtApplication ?? outcome.fitAtApplication,
    decisionAtApplication: previous?.snapshot?.decision ?? previous?.decisionAtApplication ?? outcome.decisionAtApplication,
    priorityAtApplication: previous?.snapshot?.priority ?? previous?.priorityAtApplication ?? outcome.priorityAtApplication,
    resumeVariant: previous?.snapshot?.resumeVariant ?? previous?.resumeVariant ?? outcome.resumeVariant,
  });
  const outcomes = [...current.outcomes.filter((item) => item.applicationId !== outcome.applicationId), nextOutcome];
  const events = event ? [...current.events.filter((item) => item.id !== event.id), event] : current.events;
  persistDashboardAnalytics(outcomes, events, current.efforts);
}
