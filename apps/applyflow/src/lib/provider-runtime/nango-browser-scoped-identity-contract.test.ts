/**
 * AF-NANGO-001 — provider identity contract.
 * Browser nonce ids remain distinct from account ids and are not authorization.
 * No real Nango/Gmail calls.
 */
import { describe, expect, it } from "vitest";

import { buildApplyFlowNangoAccountEndUserId } from "./nango-account-identity";
import { buildApplyFlowNangoEndUserId } from "./nango-server-provider";
import { CALLER_NONCE_A, CALLER_NONCE_B } from "./nango-route-test-fixtures";
import {
  PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
  PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE,
} from "@/components/dashboard/provider-consent-confirmation-content";
import { PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE } from "@/components/dashboard/provider-connection-disconnect-content";
import { PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES } from "@/components/dashboard/provider-derived-career-insights-content";

describe("AF-NANGO-001 account provider identity contract", () => {
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

  it("I. account ids and browser nonces produce different provider identities", () => {
    const account = buildApplyFlowNangoAccountEndUserId("gmail", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const browser = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
    expect(account).not.toBe(browser);
    expect(buildApplyFlowNangoEndUserId.length).toBe(2);
  });

  it("J. product copy states account ownership and keeps logout distinct from disconnect", () => {
    const surfaces = [
      PROVIDER_CONSENT_CONFIRMATION_OWNERSHIP_NOTICE,
      ...PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
      PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE,
      PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES.no_valid_connection,
    ].join("\n");

    expect(surfaces).toMatch(/ApplyFlow account/i);
    expect(surfaces).toMatch(/not attached automatically|not reused/i);
    expect(surfaces).not.toMatch(/logout disconnects gmail/i);
    expect(surfaces).toMatch(/logout does not disconnect/i);
  });

  it("K. no real provider calls in this contract suite (characterization only)", () => {
    expect(typeof buildApplyFlowNangoEndUserId).toBe("function");
  });
});
