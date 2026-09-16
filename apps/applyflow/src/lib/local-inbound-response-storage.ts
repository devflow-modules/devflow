import type { ResponseDetection } from "@devflow/applyflow-core";

export const APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY = "APPLYFLOW_INBOUND_RESPONSES_V1" as const;
export const DASHBOARD_INBOUND_RESPONSES_STORAGE_VERSION = 1 as const;

export type DashboardStoredInboundResponses = {
  version: typeof DASHBOARD_INBOUND_RESPONSES_STORAGE_VERSION;
  savedAt: string;
  detections: ResponseDetection[];
  legacyClosedLoopAccountScope?: string;
};

export type DashboardInboundResponsesLoadResult = {
  detections: ResponseDetection[];
  status: "empty" | "ok" | "unreadable";
  legacyClosedLoopAccountScope?: string;
};

const STATES = new Set(["pending_review", "confirmed", "dismissed"]);
const MATCHES = new Set(["matched", "ambiguous", "unmatched"]);

function empty(): DashboardInboundResponsesLoadResult {
  return { detections: [], status: "empty" };
}

function sanitizeAccountScope(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeDetection(raw: unknown): ResponseDetection | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.emailId !== "string") return null;
  if (typeof raw.headline !== "string" || typeof raw.receivedAt !== "string") return null;
  if (typeof raw.senderDomain !== "string" || typeof raw.classification !== "string") return null;
  if (!STATES.has(String(raw.state)) || !MATCHES.has(String(raw.matchStatus))) return null;
  return {
    id: raw.id,
    emailId: raw.emailId,
    headline: raw.headline,
    matchStatus: raw.matchStatus as ResponseDetection["matchStatus"],
    matchConfidence: (raw.matchConfidence as ResponseDetection["matchConfidence"]) ?? "low",
    matchEvidence: Array.isArray(raw.matchEvidence) ? raw.matchEvidence.filter((item) => typeof item === "string") : [],
    classification: raw.classification as ResponseDetection["classification"],
    classificationConfidence:
      (raw.classificationConfidence as ResponseDetection["classificationConfidence"]) ?? "low",
    classificationEvidence: Array.isArray(raw.classificationEvidence)
      ? raw.classificationEvidence.filter((item) => typeof item === "string")
      : [],
    suggestedStatus: typeof raw.suggestedStatus === "string" ? (raw.suggestedStatus as ResponseDetection["suggestedStatus"]) : null,
    pipelineChange: raw.pipelineChange === true,
    state: raw.state as ResponseDetection["state"],
    detectedAt: typeof raw.detectedAt === "string" ? raw.detectedAt : raw.receivedAt,
    receivedAt: raw.receivedAt,
    senderDomain: raw.senderDomain,
    autoApply: false,
    reviewRequired: true,
    ...(typeof raw.applicationId === "string" ? { applicationId: raw.applicationId } : {}),
    ...(Array.isArray(raw.alternateApplicationIds)
      ? { alternateApplicationIds: raw.alternateApplicationIds.filter((item) => typeof item === "string") }
      : {}),
    ...(typeof raw.companyName === "string" ? { companyName: raw.companyName } : {}),
    ...(typeof raw.jobTitle === "string" ? { jobTitle: raw.jobTitle } : {}),
    ...(typeof raw.fromStatus === "string" ? { fromStatus: raw.fromStatus as ResponseDetection["fromStatus"] } : {}),
    ...(typeof raw.confirmedEventId === "string" ? { confirmedEventId: raw.confirmedEventId } : {}),
  };
}

export function loadDashboardInboundResponses(): DashboardInboundResponsesLoadResult {
  if (typeof window === "undefined") return empty();
  const raw = window.localStorage.getItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY);
  if (!raw) return empty();
  try {
    const data = JSON.parse(raw) as DashboardStoredInboundResponses;
    if (data.version !== DASHBOARD_INBOUND_RESPONSES_STORAGE_VERSION) {
      return { detections: [], status: "unreadable" };
    }
    const detections = Array.isArray(data.detections)
      ? data.detections.map(sanitizeDetection).filter((item): item is ResponseDetection => item != null)
      : [];
    const legacyClosedLoopAccountScope = sanitizeAccountScope(data.legacyClosedLoopAccountScope);
    return {
      detections,
      status: "ok",
      ...(legacyClosedLoopAccountScope ? { legacyClosedLoopAccountScope } : {}),
    };
  } catch {
    return { detections: [], status: "unreadable" };
  }
}

export function persistDashboardInboundResponses(
  detections: ResponseDetection[],
  options?: { legacyClosedLoopAccountScope?: string | null },
): void {
  if (typeof window === "undefined") return;
  const previous = loadDashboardInboundResponses();
  const owner =
    options && "legacyClosedLoopAccountScope" in options
      ? sanitizeAccountScope(options.legacyClosedLoopAccountScope)
      : previous.legacyClosedLoopAccountScope;
  const doc: DashboardStoredInboundResponses = {
    version: DASHBOARD_INBOUND_RESPONSES_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    detections,
    ...(owner ? { legacyClosedLoopAccountScope: owner } : {}),
  };
  window.localStorage.setItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY, JSON.stringify(doc));
}
