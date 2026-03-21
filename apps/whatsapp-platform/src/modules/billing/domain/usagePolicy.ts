/**
 * Quota and overage policy.
 * Determines how much of usage is "included" vs "overage" per plan.
 */

import { getPlanLimits } from "../planConfig";

export type UsageAllocation = {
  included: number;
  overage: number;
};

/**
 * Splits quantity into included (within plan quota) and overage (to bill via Stripe).
 */
export function allocateUsage(
  quantity: number,
  includedLimit: number | null,
  alreadyIncludedUsed: number
): UsageAllocation {
  if (includedLimit == null || includedLimit <= 0) {
    return { included: 0, overage: quantity };
  }
  const remaining = Math.max(0, includedLimit - alreadyIncludedUsed);
  const toInclude = Math.min(quantity, remaining);
  const toOverage = quantity - toInclude;
  return { included: toInclude, overage: toOverage };
}

export function getMessageLimits(plan: string | null | undefined): number | null {
  return getPlanLimits(plan).messagesPerMonth;
}

export function getAiLimits(plan: string | null | undefined): number | null {
  return getPlanLimits(plan).aiResponsesPerMonth;
}
