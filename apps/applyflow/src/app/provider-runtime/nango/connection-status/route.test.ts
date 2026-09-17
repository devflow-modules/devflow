import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALLER_NONCE_A,
  CALLER_NONCE_B,
  gmailOnlyNangoTestEnv,
  mintCaller,
  nangoRequest,
} from "@/lib/provider-runtime/nango-route-test-fixtures";
import { buildApplyFlowNangoEndUserId } from "@/lib/provider-runtime/nango-server-provider";

const listConnections = vi.fn();

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function MockNango() {
    return { listConnections };
  }),
}));

vi.mock("@/lib/provider-runtime/nango-connect-session-launcher", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/provider-runtime/nango-connect-session-launcher")
  >("@/lib/provider-runtime/nango-connect-session-launcher");
  return {
    ...actual,
    readApplyFlowNangoConnectSessionEnv: () => gmailOnlyNangoTestEnv,
  };
});

import { POST } from "./route";

const URL = "http://localhost/provider-runtime/nango/connection-status";

describe("POST /provider-runtime/nango/connection-status", () => {
  beforeEach(() => {
    listConnections.mockReset();
    listConnections.mockResolvedValue({ connections: [{ errors: [] }] });
  });

  it("rejects a missing caller session before listing connections", async () => {
    const response = await POST(
      nangoRequest({ url: URL, body: { provider: "gmail", explicitConsent: true } }),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).warnings).toContain("missing_caller_session");
    expect(listConnections).not.toHaveBeenCalled();
  });

  it("rejects a foreign Origin before listing connections", async () => {
    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        origin: "https://evil.example",
        cookie: minted.cookieHeader,
        body: { provider: "gmail", explicitConsent: true },
      }),
    );
    expect(response.status).toBe(403);
    expect(listConnections).not.toHaveBeenCalled();
  });

  it("lists only the caller A tag, not caller B or the retired shared id", async () => {
    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        cookie: minted.cookieHeader,
        body: {
          provider: "gmail",
          explicitConsent: true,
          endUserId: buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_B),
        },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).state).toBe("connected");
    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-mail",
      tags: { end_user_id: buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A) },
      limit: 10,
    });
    expect(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A)).not.toBe(
      "applyflow-gmail-runtime-boundary",
    );
  });
});
