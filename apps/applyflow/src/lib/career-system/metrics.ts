import type { CareerOperationalEvent } from "./observability";

/**
 * Operational metric counters. Aggregated only — no per-request payloads, no PII, no secrets.
 */
export const CAREER_METRIC_NAMES = [
  "requests_total",
  "requests_success",
  "requests_blocked",
  "requests_error",
  "duration_ms",
  "external_provider_calls",
  "agent_runs",
  "llm_runs",
  "health_failures",
  "feedback_submissions",
] as const;

export type CareerMetricName = (typeof CAREER_METRIC_NAMES)[number];

export type CareerMetricsSnapshot = Record<CareerMetricName, number>;

/**
 * Abstract metrics adapter. The default implementation aggregates in memory with no external
 * sink. There is no Prometheus/Datadog/paid service in this boundary; an adapter could be
 * swapped in later without changing call sites.
 */
export type CareerMetricsAdapter = {
  provider: string;
  increment: (name: CareerMetricName, value?: number) => void;
  observeDuration: (durationMs: number) => void;
  recordEvent: (event: CareerOperationalEvent) => void;
  snapshot: () => CareerMetricsSnapshot;
  reset: () => void;
};

function emptySnapshot(): CareerMetricsSnapshot {
  return CAREER_METRIC_NAMES.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {} as CareerMetricsSnapshot);
}

export function createInMemoryCareerMetricsAdapter(): CareerMetricsAdapter {
  let counters = emptySnapshot();

  function increment(name: CareerMetricName, value = 1): void {
    counters[name] += value;
  }

  function observeDuration(durationMs: number): void {
    const safe = Math.max(0, Math.round(Number(durationMs) || 0));
    counters.duration_ms += safe;
  }

  function recordEvent(event: CareerOperationalEvent): void {
    increment("requests_total");
    if (event.outcome === "success") {
      increment("requests_success");
    } else if (event.outcome === "blocked") {
      increment("requests_blocked");
    } else if (event.outcome === "error") {
      increment("requests_error");
    }

    observeDuration(event.durationMs);

    if (event.externalProviderCalled === true) {
      increment("external_provider_calls");
    }

    if (event.eventName === "career_agent_completed" || event.eventName === "career_agent_blocked") {
      increment("agent_runs");
    }
    if (event.eventName === "career_llm_completed" || event.eventName === "career_llm_failed") {
      increment("llm_runs");
    }
    if (event.eventName === "career_feedback_submitted") {
      increment("feedback_submissions");
    }
    if (event.eventName === "career_health_probe_completed" && event.outcome === "error") {
      increment("health_failures");
    }
  }

  return {
    provider: "in_memory",
    increment,
    observeDuration,
    recordEvent,
    snapshot: () => ({ ...counters }),
    reset: () => {
      counters = emptySnapshot();
    },
  };
}

/**
 * Default process-wide in-memory adapter. Not persisted; resets on restart.
 */
export const careerMetrics = createInMemoryCareerMetricsAdapter();
