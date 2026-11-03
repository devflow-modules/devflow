import { describe, it, expect } from "vitest";
import {
  STRIPE_UNAVAILABLE_IN_ENVIRONMENT,
  StripeEnvironmentDeniedError,
  assertStripeSecretKeyAllowed,
  assertStripeWebhookProcessingAllowed,
  classifyStripeSecretKey,
  evaluateStripeRuntimeAccess,
  isStripeEnvironmentDeniedError,
  isStripeSecretKeyAllowed,
  isStripeWebhookProcessingAllowed,
} from "../stripeRuntimePolicy";

const LIVE = "sk_live_synthetic_audit_key_not_real";
const TEST = "sk_test_synthetic_audit_key_not_real";
const UNKNOWN = "rk_restricted_or_opaque_key";

describe("stripeRuntimePolicy", () => {
  describe("classifyStripeSecretKey", () => {
    it("classifies live and test prefixes", () => {
      expect(classifyStripeSecretKey(LIVE)).toBe("live");
      expect(classifyStripeSecretKey(TEST)).toBe("test");
      expect(classifyStripeSecretKey(UNKNOWN)).toBe("unknown");
    });
  });

  describe("environment matrix (E01–E10)", () => {
    it("E01 Vercel Production + Live → allowed", () => {
      const d = evaluateStripeRuntimeAccess(
        { VERCEL: "1", VERCEL_ENV: "production" },
        "live"
      );
      expect(d).toEqual({ allowed: true, deployment: "vercel_production" });
      expect(() =>
        assertStripeSecretKeyAllowed(LIVE, { VERCEL: "1", VERCEL_ENV: "production" })
      ).not.toThrow();
    });

    it("E02 Vercel Preview + Live → blocked", () => {
      const d = evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "preview" }, "live");
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.deployment).toBe("vercel_preview");
      expect(() =>
        assertStripeSecretKeyAllowed(LIVE, { VERCEL: "1", VERCEL_ENV: "preview" })
      ).toThrow(StripeEnvironmentDeniedError);
    });

    it("E03 Vercel Development + Live → blocked", () => {
      expect(
        evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "development" }, "live").allowed
      ).toBe(false);
    });

    it("E04 Vercel without VERCEL_ENV + Live → blocked", () => {
      const d = evaluateStripeRuntimeAccess({ VERCEL: "1" }, "live");
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.deployment).toBe("vercel_unknown");
    });

    it("E05 VERCEL_ENV=Production (wrong case) → blocked", () => {
      expect(
        evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "Production" }, "live").allowed
      ).toBe(false);
    });

    it("E06 unknown VERCEL_ENV → blocked", () => {
      expect(
        evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "staging" }, "live").allowed
      ).toBe(false);
    });

    it("E07 CI local Live → blocked", () => {
      expect(evaluateStripeRuntimeAccess({}, "live").allowed).toBe(false);
      expect(isStripeSecretKeyAllowed(LIVE, {})).toBe(false);
    });

    it("E08 Dev local Live → blocked by default", () => {
      expect(() => assertStripeSecretKeyAllowed(LIVE, {})).toThrow(StripeEnvironmentDeniedError);
    });

    it("E09 Preview without usable key still denied for webhook", () => {
      expect(isStripeWebhookProcessingAllowed({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(
        false
      );
    });

    it("E10 Production policy allows access check even when key missing is separate", () => {
      expect(
        evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "production" }, "live").allowed
      ).toBe(true);
    });
  });

  describe("local test keys (T08)", () => {
    it("allows sk_test_ locally without Vercel markers", () => {
      expect(evaluateStripeRuntimeAccess({}, "test")).toEqual({
        allowed: true,
        deployment: "local_test",
      });
      expect(() => assertStripeSecretKeyAllowed(TEST, {})).not.toThrow();
    });

    it("does not treat test keys as live authorization on Preview", () => {
      expect(
        evaluateStripeRuntimeAccess({ VERCEL: "1", VERCEL_ENV: "preview" }, "test").allowed
      ).toBe(false);
    });

    it("unknown key mode is fail-closed locally", () => {
      expect(evaluateStripeRuntimeAccess({}, "unknown").allowed).toBe(false);
    });
  });

  describe("webhook processing", () => {
    it("allows Production and local; blocks Preview", () => {
      expect(() =>
        assertStripeWebhookProcessingAllowed({ VERCEL: "1", VERCEL_ENV: "production" })
      ).not.toThrow();
      expect(() => assertStripeWebhookProcessingAllowed({})).not.toThrow();
      expect(() =>
        assertStripeWebhookProcessingAllowed({ VERCEL: "1", VERCEL_ENV: "preview" })
      ).toThrow(StripeEnvironmentDeniedError);
    });

    it("VERCEL_ENV=production without VERCEL=1 is fail-closed", () => {
      expect(isStripeWebhookProcessingAllowed({ VERCEL_ENV: "production" })).toBe(false);
    });
  });

  describe("error sanitization (T09)", () => {
    it("denied error has stable code and no secret material", () => {
      try {
        assertStripeSecretKeyAllowed(LIVE, { VERCEL: "1", VERCEL_ENV: "preview" });
        expect.unreachable();
      } catch (err) {
        expect(isStripeEnvironmentDeniedError(err)).toBe(true);
        expect((err as StripeEnvironmentDeniedError).code).toBe(
          STRIPE_UNAVAILABLE_IN_ENVIRONMENT
        );
        expect(String(err)).not.toContain("sk_live_");
        expect(String(err)).not.toContain(LIVE);
      }
    });
  });
});
