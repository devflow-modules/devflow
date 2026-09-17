import { describe, expect, it, vi } from "vitest";
import {
  handleGmailClosedLoopInboundScan,
  parseGmailClosedLoopInboundRequest,
} from "./gmail-closed-loop-inbound-boundary";

describe("gmail closed-loop inbound boundary", () => {
  it("blocks missing consent and invalid limits", () => {
    expect(parseGmailClosedLoopInboundRequest({})).toEqual({
      ok: false,
      error: "missing_consent",
      httpStatus: 403,
    });
    expect(parseGmailClosedLoopInboundRequest({ explicitConsent: true, limit: 99 })).toEqual({
      ok: false,
      error: "invalid_limits",
      httpStatus: 400,
    });
  });

  it("scans read-only Gmail metadata without Calendar flags and never calls modify", async () => {
    const listInboundEmails = vi.fn(async () => ({
      accountScopes: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      needsAccountSelection: false,
      selectedAccountScope: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      emails: [
        {
          id: "hashed-id",
          legacyId: "legacy-hashed-id",
          accountScope: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          receivedAt: "2026-09-15T18:00:00.000Z",
          senderDomain: "bluelightconsulting.com",
          subject: "Interview invitation",
        },
      ],
    }));
    const result = await handleGmailClosedLoopInboundScan({
      env: {
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
        GMAIL_PROVIDER_ENABLED: "true",
        NANGO_SECRET_KEY: "test-secret",
      },
      requestedAt: "2026-09-15T18:00:00.000Z",
      limit: 10,
      explicitConsent: true,
      verificationDeps: {
        verificationProvider: {
          verifyConnection: async () => ({
            exists: true,
            state: "connected" as const,
          }),
        },
      },
      metadataProvider: {
        listMessageMetadata: async () => [],
        listInboundEmails,
      },
    });

    expect(result.status).toBe("completed");
    expect(result.readOnly).toBe(true);
    expect(result.retainedBodies).toBe(false);
    expect(result.emails[0]?.id).toBe("hashed-id");
    expect(result.emails[0]?.legacyId).toBe("legacy-hashed-id");
    expect(result.accountScopes).toEqual(["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
    expect(result.hasToken).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/connection_id|conn-|access_token/i);
    expect(listInboundEmails).toHaveBeenCalledTimes(1);
  });

  it("blocks an invalid account scope and does not scan every mailbox", async () => {
    expect(
      parseGmailClosedLoopInboundRequest({
        explicitConsent: true,
        accountScope: "conn-b",
      }),
    ).toEqual({
      ok: false,
      error: "invalid_account_scope",
      httpStatus: 400,
    });

    const listInboundEmails = vi.fn(async () => ({
      accountScopes: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      needsAccountSelection: true,
      emails: [],
    }));
    const result = await handleGmailClosedLoopInboundScan({
      env: {
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
        GMAIL_PROVIDER_ENABLED: "true",
        NANGO_SECRET_KEY: "test-secret",
      },
      requestedAt: "2026-09-15T18:00:00.000Z",
      limit: 10,
      explicitConsent: true,
      verificationDeps: {
        verificationProvider: {
          verifyConnection: async () => ({
            exists: true,
            state: "connected" as const,
          }),
        },
      },
      metadataProvider: {
        listMessageMetadata: async () => [],
        listInboundEmails,
      },
    });
    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("need_account_selection");
    expect(result.emails).toEqual([]);
    expect(result.accountScopes).toHaveLength(2);
  });
});
