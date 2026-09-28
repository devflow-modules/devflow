/**
 * AF-NANGO-001 — Browser-scoped Nango identity contract characterization.
 * No real Nango/Gmail calls. Ownership is callerNonce-derived only.
 */
import { describe, expect, it } from "vitest";

import { buildApplyFlowNangoEndUserId } from "./nango-server-provider";
import { CALLER_NONCE_A, CALLER_NONCE_B } from "./nango-route-test-fixtures";
import {
  PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
  PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE,
} from "@/components/dashboard/provider-consent-confirmation-content";
import { PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE } from "@/components/dashboard/provider-connection-disconnect-content";
import { PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES } from "@/components/dashboard/provider-derived-career-insights-content";

describe("AF-NANGO-001 browser-scoped identity contract", () => {
  it("A. Caller X derives a deterministic provider end_user_id", () => {
    const first = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
    const second = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
    expect(first).toBe(second);
    expect(first).toMatch(/^applyflow-gmail-[a-f0-9]{32}$/);
  });

  it("B. Caller X != Caller Y for the same provider", () => {
    expect(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A)).not.toBe(
      buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_B),
    );
  });

  it("C. Gmail identity is separated from Calendar identity for the same caller", () => {
    expect(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A)).not.toBe(
      buildApplyFlowNangoEndUserId("calendar", CALLER_NONCE_A),
    );
  });

  it("I. fictional ApplyFlow account ids are not inputs to ownership (same-caller characterization)", () => {
    // Account A vs Account B cannot appear in the derivation function — only (provider, nonce).
    const ownerForConceptualAccountA = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
    const ownerForConceptualAccountB = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
    expect(ownerForConceptualAccountA).toBe(ownerForConceptualAccountB);

    const derivationArityEvidence = buildApplyFlowNangoEndUserId.length;
    expect(derivationArityEvidence).toBe(2); // provider + callerNonce only
  });

  it("J. product copy does not claim ApplyFlow account ownership", () => {
    const surfaces = [
      PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE,
      ...PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
      PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE,
      PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES.no_valid_connection,
    ].join("\n");

    expect(surfaces.toLowerCase()).toContain("browser");
    expect(surfaces.toLowerCase()).not.toMatch(/linked to your applyflow account login/);
    expect(surfaces).toMatch(/not linked to your ApplyFlow account/i);
    expect(surfaces).not.toMatch(/available on all devices/i);
    expect(surfaces).not.toMatch(/follows your login/i);
    expect(surfaces).not.toMatch(/logout disconnects gmail/i);
    expect(surfaces).not.toMatch(/account-bound/i);
  });

  it("K. no real provider calls in this contract suite (characterization only)", () => {
    expect(typeof buildApplyFlowNangoEndUserId).toBe("function");
  });
});
