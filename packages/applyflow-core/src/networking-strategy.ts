import type { OpportunityEvidence } from "./contact-types.js";

export const NETWORKING_STRATEGIES = [
  "apply_and_message",
  "apply_first_then_message",
  "message_first",
  "apply_only",
  "networking_only",
] as const;

export type NetworkingStrategy = (typeof NETWORKING_STRATEGIES)[number];

export const OPPORTUNITY_AVAILABILITY_STATUSES = [
  "confirmed_open",
  "confirmed_or_probable_open",
  "probable_open",
] as const;

export type OpportunityAvailabilityStatus = (typeof OPPORTUNITY_AVAILABILITY_STATUSES)[number];

/** Optional opportunity-level networking metadata nested in `jobContext` (cloud-safe JSON). */
export type JobNetworkingMeta = {
  strategy?: NetworkingStrategy;
  priority?: number;
  availabilityStatus?: OpportunityAvailabilityStatus;
  recommendedCases?: string[];
  evidence?: OpportunityEvidence;
  /**
   * When true, hydrate/reevaluate must not overwrite `jobMatch` (manual/pipeline scores).
   * Set by private opportunity pipeline import.
   */
  manualMatchOverride?: boolean;
};

export const NETWORKING_STRATEGY_LABELS: Record<NetworkingStrategy, string> = {
  apply_and_message: "Apply + message",
  apply_first_then_message: "Apply first, then message",
  message_first: "Message first",
  apply_only: "Apply only",
  networking_only: "Networking only",
};

export function isNetworkingStrategy(value: unknown): value is NetworkingStrategy {
  return typeof value === "string" && (NETWORKING_STRATEGIES as readonly string[]).includes(value);
}

export function isOpportunityAvailabilityStatus(value: unknown): value is OpportunityAvailabilityStatus {
  return (
    typeof value === "string" && (OPPORTUNITY_AVAILABILITY_STATUSES as readonly string[]).includes(value)
  );
}

export function readJobNetworkingMeta(context: {
  networking?: JobNetworkingMeta;
}): JobNetworkingMeta | undefined {
  return context.networking;
}

export function withJobNetworkingMeta<T extends { networking?: JobNetworkingMeta }>(
  context: T,
  networking: JobNetworkingMeta | undefined,
): T {
  if (!networking || Object.keys(networking).length === 0) {
    const { networking: _omit, ...rest } = context;
    return rest as T;
  }
  return { ...context, networking };
}
