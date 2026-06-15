import type { CalendarReadOnlySafetyPolicy } from "./types.js";

const SAFETY_VIOLATION_MESSAGES: Readonly<Record<keyof CalendarReadOnlySafetyPolicy, string>> = {
  readOnly: "readOnly must be true",
  allowRawDescriptions: "allowRawDescriptions must be false",
  allowRawLocations: "allowRawLocations must be false",
  allowMeetingLinks: "allowMeetingLinks must be false",
  allowAttendeeAddresses: "allowAttendeeAddresses must be false",
  allowAttachments: "allowAttachments must be false",
  allowRawProviderPayload: "allowRawProviderPayload must be false",
  allowTokenExposure: "allowTokenExposure must be false",
  requireVerifiedConnection: "requireVerifiedConnection must be true",
  requireUserReview: "requireUserReview must be true",
};

export function createCalendarReadOnlySafetyPolicy(): CalendarReadOnlySafetyPolicy {
  return {
    readOnly: true,
    allowRawDescriptions: false,
    allowRawLocations: false,
    allowMeetingLinks: false,
    allowAttendeeAddresses: false,
    allowAttachments: false,
    allowRawProviderPayload: false,
    allowTokenExposure: false,
    requireVerifiedConnection: true,
    requireUserReview: true,
  };
}

export function isCalendarReadOnlySafetyPolicySafe(
  policy: CalendarReadOnlySafetyPolicy,
): boolean {
  return (
    policy.readOnly === true &&
    policy.allowRawDescriptions === false &&
    policy.allowRawLocations === false &&
    policy.allowMeetingLinks === false &&
    policy.allowAttendeeAddresses === false &&
    policy.allowAttachments === false &&
    policy.allowRawProviderPayload === false &&
    policy.allowTokenExposure === false &&
    policy.requireVerifiedConnection === true &&
    policy.requireUserReview === true
  );
}

export function collectCalendarReadOnlySafetyPolicyWarnings(
  policy: CalendarReadOnlySafetyPolicy,
): string[] {
  const warnings: string[] = [];

  for (const key of Object.keys(SAFETY_VIOLATION_MESSAGES) as Array<
    keyof CalendarReadOnlySafetyPolicy
  >) {
    const expected = key === "readOnly" || key.startsWith("require") ? true : false;
    if (policy[key] !== expected) {
      warnings.push(SAFETY_VIOLATION_MESSAGES[key]);
    }
  }

  return warnings;
}

export function assertCalendarReadOnlySafetyPolicy(
  policy: CalendarReadOnlySafetyPolicy,
): CalendarReadOnlySafetyPolicy {
  if (!isCalendarReadOnlySafetyPolicySafe(policy)) {
    const violations = collectCalendarReadOnlySafetyPolicyWarnings(policy);
    throw new Error(`Unsafe Calendar read-only safety policy: ${violations.join(", ")}`);
  }

  return { ...policy };
}
