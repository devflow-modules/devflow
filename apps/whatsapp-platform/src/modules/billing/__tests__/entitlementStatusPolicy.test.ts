import { describe, it, expect } from "vitest";
import {
  isBillingSubscriptionStatusEntitled,
  isTenantSubscriptionStatusEntitled,
} from "../entitlementStatusPolicy";

describe("entitlementStatusPolicy", () => {
  it.each([
    ["ACTIVE", true],
    ["TRIAL", true],
    ["PAST_DUE", false],
    ["CANCELED", false],
    ["", false],
    [undefined, false],
  ] as const)("TenantSubscription status %s → entitled=%s", (status, expected) => {
    expect(isTenantSubscriptionStatusEntitled(status)).toBe(expected);
  });

  it.each([
    ["active", true],
    ["trialing", true],
    ["past_due", false],
    ["canceled", false],
    ["unpaid", false],
    ["incomplete", false],
    ["incomplete_expired", false],
    ["paused", false],
    ["weird_unknown", false],
    [undefined, false],
  ] as const)("BillingSubscription status %s → entitled=%s", (status, expected) => {
    expect(isBillingSubscriptionStatusEntitled(status)).toBe(expected);
  });
});
