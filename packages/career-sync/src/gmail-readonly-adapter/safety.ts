import type { GmailReadOnlySafetyPolicy } from "./types.js";

const SAFETY_VIOLATION_MESSAGES: Readonly<Record<keyof GmailReadOnlySafetyPolicy, string>> = {
  readOnly: "readOnly must be true",
  allowRawBodies: "allowRawBodies must be false",
  allowRawSnippets: "allowRawSnippets must be false",
  allowAttachments: "allowAttachments must be false",
  allowRawProviderPayload: "allowRawProviderPayload must be false",
  allowTokenExposure: "allowTokenExposure must be false",
  allowMeetingLinks: "allowMeetingLinks must be false",
  requireVerifiedConnection: "requireVerifiedConnection must be true",
  requireUserReview: "requireUserReview must be true",
};

export function createGmailReadOnlySafetyPolicy(): GmailReadOnlySafetyPolicy {
  return {
    readOnly: true,
    allowRawBodies: false,
    allowRawSnippets: false,
    allowAttachments: false,
    allowRawProviderPayload: false,
    allowTokenExposure: false,
    allowMeetingLinks: false,
    requireVerifiedConnection: true,
    requireUserReview: true,
  };
}

export function isGmailReadOnlySafetyPolicySafe(policy: GmailReadOnlySafetyPolicy): boolean {
  return (
    policy.readOnly === true &&
    policy.allowRawBodies === false &&
    policy.allowRawSnippets === false &&
    policy.allowAttachments === false &&
    policy.allowRawProviderPayload === false &&
    policy.allowTokenExposure === false &&
    policy.allowMeetingLinks === false &&
    policy.requireVerifiedConnection === true &&
    policy.requireUserReview === true
  );
}

export function collectGmailReadOnlySafetyPolicyWarnings(
  policy: GmailReadOnlySafetyPolicy,
): string[] {
  const warnings: string[] = [];

  for (const key of Object.keys(SAFETY_VIOLATION_MESSAGES) as Array<
    keyof GmailReadOnlySafetyPolicy
  >) {
    const expected = key === "readOnly" || key.startsWith("require") ? true : false;
    if (policy[key] !== expected) {
      warnings.push(SAFETY_VIOLATION_MESSAGES[key]);
    }
  }

  return warnings;
}

export function assertGmailReadOnlySafetyPolicy(
  policy: GmailReadOnlySafetyPolicy,
): GmailReadOnlySafetyPolicy {
  if (!isGmailReadOnlySafetyPolicySafe(policy)) {
    const violations = collectGmailReadOnlySafetyPolicyWarnings(policy);
    throw new Error(`Unsafe Gmail read-only safety policy: ${violations.join(", ")}`);
  }

  return { ...policy };
}
