import type { ProviderAdapterResult, ProviderAdapterSafetyPolicy } from "./types.js";

const SAFETY_VIOLATION_MESSAGES: Readonly<
  Record<keyof ProviderAdapterSafetyPolicy, string>
> = {
  rawPayloadRetained: "rawPayloadRetained must be false",
  tokensExposedToClient: "tokensExposedToClient must be false",
  meetingLinksRetained: "meetingLinksRetained must be false",
  attachmentsRetained: "attachmentsRetained must be false",
  providerIdsRetained: "providerIdsRetained must be false",
  userReviewRequired: "userReviewRequired must be true",
};

/** Returns a new safe-by-default provider adapter safety policy. */
export function createProviderAdapterSafetyPolicy(): ProviderAdapterSafetyPolicy {
  return {
    rawPayloadRetained: false,
    tokensExposedToClient: false,
    meetingLinksRetained: false,
    attachmentsRetained: false,
    providerIdsRetained: false,
    userReviewRequired: true,
  };
}

export function isProviderAdapterSafetyPolicySafe(
  safety: ProviderAdapterSafetyPolicy,
): boolean {
  return (
    safety.rawPayloadRetained === false &&
    safety.tokensExposedToClient === false &&
    safety.meetingLinksRetained === false &&
    safety.attachmentsRetained === false &&
    safety.providerIdsRetained === false &&
    safety.userReviewRequired === true
  );
}

export function collectProviderAdapterSafetyWarnings(
  safety: ProviderAdapterSafetyPolicy,
): string[] {
  const warnings: string[] = [];
  for (const key of Object.keys(SAFETY_VIOLATION_MESSAGES) as Array<
    keyof ProviderAdapterSafetyPolicy
  >) {
    const expected = key === "userReviewRequired" ? true : false;
    if (safety[key] !== expected) {
      warnings.push(SAFETY_VIOLATION_MESSAGES[key]);
    }
  }
  return warnings;
}

export function assertProviderAdapterSafetyPolicy(
  safety: ProviderAdapterSafetyPolicy,
): ProviderAdapterSafetyPolicy {
  if (!isProviderAdapterSafetyPolicySafe(safety)) {
    const violations = collectProviderAdapterSafetyWarnings(safety);
    throw new Error(`Unsafe provider adapter safety policy: ${violations.join(", ")}`);
  }
  return { ...safety };
}

export function assertProviderAdapterResultSafe<TDerived>(
  result: ProviderAdapterResult<TDerived>,
): ProviderAdapterResult<TDerived> {
  assertProviderAdapterSafetyPolicy(result.safety);
  return {
    ...result,
    derived: [...result.derived],
    warnings: [...result.warnings],
    safety: { ...result.safety },
  };
}
