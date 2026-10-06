import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALLER_NONCE_A,
  CALLER_NONCE_B,
  gmailOnlyNangoTestEnv,
  mintCaller,
  nangoRequest,
} from "@/lib/provider-runtime/nango-route-test-fixtures";
import { buildApplyFlowNangoAccountEndUserId } from "@/lib/provider-runtime/nango-account-identity";
import { NANGO_ROUTE_ACCOUNT_ID } from "@/lib/provider-runtime/nango-route-account-mock";

const createConnectSession = vi.fn(async () => ({
  data: { token: "nango-session-token" },
}));

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function MockNango() {
    return { createConnectSession };
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

vi.mock("@/lib/persistence-v2/require-applyflow-account", () =>
  import("@/lib/provider-runtime/nango-route-account-mock"),
);

import { GET, POST } from "./route";

const URL = "http://localhost/provider-runtime/nango/connect";

describe("POST /provider-runtime/nango/connect", () => {
  beforeEach(() => {
    createConnectSession.mockClear();
  });

  it("rejects GET without minting a session", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.reasons).toContain("method_not_allowed");
    expect(createConnectSession).not.toHaveBeenCalled();
  });

  it("rejects a foreign Origin before creating a Connect Session", async () => {
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
    expect((await response.json()).reasons).toContain("cross_origin_forbidden");
    expect(createConnectSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a missing Origin", async () => {
    const response = await POST(
      nangoRequest({
        url: URL,
        origin: "omit",
        body: { provider: "gmail", explicitConsent: true },
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).reasons).toContain("missing_request_origin");
    expect(createConnectSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("tags the Connect Session to the authenticated account and ignores client identity", async () => {
    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        cookie: minted.cookieHeader,
        body: { provider: "gmail", explicitConsent: true, endUserId: "applyflow-gmail-runtime-boundary" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(createConnectSession).toHaveBeenCalledWith({
      tags: { end_user_id: buildApplyFlowNangoAccountEndUserId("gmail", NANGO_ROUTE_ACCOUNT_ID) },
      allowed_integrations: ["google-mail"],
    });
    expect(buildApplyFlowNangoAccountEndUserId("gmail", NANGO_ROUTE_ACCOUNT_ID)).not.toBe(
      "applyflow-gmail-runtime-boundary",
    );
    expect((await response.json()).ownership).toBe("applyflow_account");
  });

  it("does not adopt a browser caller nonce supplied by the client", async () => {
    const mintedA = mintCaller(CALLER_NONCE_A);
    await POST(
      nangoRequest({
        url: URL,
        cookie: mintedA.cookieHeader,
        body: { provider: "gmail", explicitConsent: true, callerNonce: CALLER_NONCE_B },
      }),
    );
    expect(createConnectSession).toHaveBeenCalledWith({
      tags: { end_user_id: buildApplyFlowNangoAccountEndUserId("gmail", NANGO_ROUTE_ACCOUNT_ID) },
      allowed_integrations: ["google-mail"],
    });
  });
});
