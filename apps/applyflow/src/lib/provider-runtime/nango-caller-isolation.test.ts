import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGmailNangoRuntimeMetadataProvider, type GmailNangoRuntimeSdk, hashClosedLoopAccountScope } from "./gmail-readonly-nango-provider.js";
import { buildApplyFlowNangoEndUserId } from "./nango-server-provider.js";
import { CALLER_NONCE_A, CALLER_NONCE_B } from "./nango-route-test-fixtures.js";
import { handleGmailClosedLoopInboundScan } from "./gmail-closed-loop-inbound-boundary.js";

const listConnections = vi.fn();
const get = vi.fn();

const sdk: GmailNangoRuntimeSdk = {
  listConnections,
  get,
};

const END_USER_A = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A);
const END_USER_B = buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_B);
const SCOPE_B = hashClosedLoopAccountScope("conn-b");

describe("nango caller isolation", () => {
  beforeEach(() => {
    listConnections.mockReset();
    get.mockReset();
  });

  it("never builds the retired shared runtime-boundary tag", () => {
    expect(END_USER_A).not.toBe("applyflow-gmail-runtime-boundary");
    expect(END_USER_B).not.toBe("applyflow-gmail-runtime-boundary");
    expect(buildApplyFlowNangoEndUserId("calendar", CALLER_NONCE_A)).not.toBe(
      "applyflow-calendar-runtime-boundary",
    );
  });

  it("blocks inbound scans without a caller nonce instead of falling back to the shared id", async () => {
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
          verifyConnection: async () => ({ exists: true, state: "connected" }),
        },
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("missing_caller_session");
    expect(listConnections).not.toHaveBeenCalled();
  });

  it("does not let session A read session B mailboxes by accountScope", async () => {
    listConnections.mockImplementation(async (input: { tags: { end_user_id: string } }) => {
      if (input.tags.end_user_id === END_USER_B) {
        return { connections: [{ connection_id: "conn-b" }] };
      }
      if (input.tags.end_user_id === END_USER_A) {
        return { connections: [{ connection_id: "conn-a" }] };
      }
      if (input.tags.end_user_id === "applyflow-gmail-runtime-boundary") {
        return { connections: [{ connection_id: "conn-shared" }] };
      }
      return { connections: [] };
    });

    const providerA = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      endUserId: END_USER_A,
      sdk,
    });

    const listed = await providerA.listInboundEmails?.({
      limit: 5,
      accountScope: SCOPE_B,
    });

    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-mail",
      tags: { end_user_id: END_USER_A },
      limit: 10,
    });
    expect(listConnections.mock.calls.some((call) => call[0].tags.end_user_id === END_USER_B)).toBe(
      false,
    );
    expect(
      listConnections.mock.calls.some(
        (call) => call[0].tags.end_user_id === "applyflow-gmail-runtime-boundary",
      ),
    ).toBe(false);
    expect(get).not.toHaveBeenCalled();
    expect(listed?.needsAccountSelection).toBe(true);
    expect(listed?.emails).toEqual([]);
  });
});
