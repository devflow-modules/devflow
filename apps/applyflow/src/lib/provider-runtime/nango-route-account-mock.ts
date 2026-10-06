import { vi } from "vitest";

export const NANGO_ROUTE_ACCOUNT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export const nangoRouteAuth = {
  signedIn: true,
};

export class ApplyFlowAuthError extends Error {
  readonly code: string;

  constructor(code = "unauthenticated") {
    super(code);
    this.name = "ApplyFlowAuthError";
    this.code = code;
  }
}

export const requireApplyFlowAccount = vi.fn(async () => {
  if (!nangoRouteAuth.signedIn) {
    throw new ApplyFlowAuthError("unauthenticated");
  }
  return {
    id: NANGO_ROUTE_ACCOUNT_ID,
    authProviderSub: "sub-a",
    email: "a@example.com",
    pilotEligible: true,
    canonicalPersistence: "v2_cloud" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
});
