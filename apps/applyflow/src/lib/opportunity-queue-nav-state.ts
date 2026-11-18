import {
  APPLYFLOW_JOB_SOURCES,
  JOB_MATCH_DECISIONS,
  type ApplyFlowJobSource,
  type JobMatchDecision,
  type OpportunityQueueSort,
  type OpportunityQueueView,
} from "@devflow/applyflow-core";

/**
 * Per-tab UI state of the Oportunidades queue (filters + the job opened from it).
 * Holds only enum filters and an opaque job id — never candidate data — and never goes in the URL.
 */
export const OPPORTUNITY_QUEUE_NAV_STORAGE_KEY = "APPLYFLOW_OPPORTUNITY_QUEUE_NAV_V1";

export type OpportunityQueueFilters = {
  view: OpportunityQueueView;
  sort: OpportunityQueueSort;
  decision: JobMatchDecision | "all";
  source: ApplyFlowJobSource | "all";
};

export type OpportunityQueueNavState = OpportunityQueueFilters & {
  anchorJobId?: string;
};

export const DEFAULT_OPPORTUNITY_QUEUE_FILTERS: OpportunityQueueFilters = {
  view: "active",
  sort: "match",
  decision: "all",
  source: "all",
};

const VIEWS: readonly OpportunityQueueView[] = ["active", "all", "ignored"];
const SORTS: readonly OpportunityQueueSort[] = ["match", "recency"];
const ANCHOR_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseOpportunityQueueNavState(raw: string | null | undefined): OpportunityQueueNavState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const state: OpportunityQueueNavState = {
    view: pick(record.view, VIEWS, DEFAULT_OPPORTUNITY_QUEUE_FILTERS.view),
    sort: pick(record.sort, SORTS, DEFAULT_OPPORTUNITY_QUEUE_FILTERS.sort),
    decision: pick<JobMatchDecision | "all">(record.decision, [...JOB_MATCH_DECISIONS, "all"], "all"),
    source: pick<ApplyFlowJobSource | "all">(record.source, [...APPLYFLOW_JOB_SOURCES, "all"], "all"),
  };
  if (typeof record.anchorJobId === "string" && ANCHOR_PATTERN.test(record.anchorJobId)) {
    state.anchorJobId = record.anchorJobId;
  }
  return state;
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readOpportunityQueueNavState(storage: Storage | null = sessionStore()): OpportunityQueueNavState | null {
  if (!storage) return null;
  try {
    return parseOpportunityQueueNavState(storage.getItem(OPPORTUNITY_QUEUE_NAV_STORAGE_KEY));
  } catch {
    return null;
  }
}

function write(state: OpportunityQueueNavState, storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.setItem(OPPORTUNITY_QUEUE_NAV_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode: queue context is a convenience only */
  }
}

/** Persists filters; keeps any pending anchor untouched. */
export function saveOpportunityQueueFilters(
  filters: OpportunityQueueFilters,
  storage: Storage | null = sessionStore(),
): void {
  const current = readOpportunityQueueNavState(storage);
  write({ ...filters, ...(current?.anchorJobId ? { anchorJobId: current.anchorJobId } : {}) }, storage);
}

/** Remembers which job was opened from the queue so the return can land on it. */
export function markOpportunityQueueAnchor(jobId: string, storage: Storage | null = sessionStore()): void {
  if (!ANCHOR_PATTERN.test(jobId)) return;
  const current = readOpportunityQueueNavState(storage) ?? DEFAULT_OPPORTUNITY_QUEUE_FILTERS;
  write({ ...current, anchorJobId: jobId }, storage);
}

/** Returns the pending anchor once and clears it, so later visits start at the top. */
export function consumeOpportunityQueueAnchor(storage: Storage | null = sessionStore()): string | null {
  const current = readOpportunityQueueNavState(storage);
  if (!current?.anchorJobId) return null;
  const { anchorJobId, ...filters } = current;
  write(filters, storage);
  return anchorJobId;
}

export function hasOpportunityQueueAnchor(jobId: string, storage: Storage | null = sessionStore()): boolean {
  return readOpportunityQueueNavState(storage)?.anchorJobId === jobId;
}
