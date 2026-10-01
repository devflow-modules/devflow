import { describe, expect, it } from "vitest";

import {
  assertE2ESecretMatches,
  isApplyFlowE2EProviderFixturesEnabled,
  isApplyFlowE2ERuntimeAllowed,
} from "./runtime-guard";

describe("ApplyFlow E2E runtime guard", () => {
  it("refuses when APPLYFLOW_E2E is off", () => {
    expect(
      isApplyFlowE2ERuntimeAllowed({
        APPLYFLOW_E2E_SECRET: "secret",
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });

  it("refuses real Vercel production and platform preview", () => {
    expect(
      isApplyFlowE2ERuntimeAllowed({
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: "secret",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isApplyFlowE2ERuntimeAllowed({
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: "secret",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("allows local/CI simulation with VERCEL_ENV=preview when VERCEL unset", () => {
    expect(
      isApplyFlowE2ERuntimeAllowed({
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: "secret",
        VERCEL_ENV: "preview",
        NODE_ENV: "development",
      }),
    ).toBe(true);
  });

  it("fixtures require both runtime and fixtures flag", () => {
    expect(
      isApplyFlowE2EProviderFixturesEnabled({
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: "secret",
        NODE_ENV: "development",
      }),
    ).toBe(false);
    expect(
      isApplyFlowE2EProviderFixturesEnabled({
        APPLYFLOW_E2E: "1",
        APPLYFLOW_E2E_SECRET: "secret",
        APPLYFLOW_E2E_PROVIDER_FIXTURES: "1",
        NODE_ENV: "development",
      }),
    ).toBe(true);
  });

  it("secret compare is exact", () => {
    const env = {
      APPLYFLOW_E2E: "1",
      APPLYFLOW_E2E_SECRET: "correct-secret",
      NODE_ENV: "development",
    };
    expect(assertE2ESecretMatches("correct-secret", env)).toBe(true);
    expect(assertE2ESecretMatches("wrong-secret", env)).toBe(false);
    expect(assertE2ESecretMatches("correct-secret", { ...env, VERCEL_ENV: "production" })).toBe(false);
  });
});
