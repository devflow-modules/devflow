import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALLER_NONCE_A,
  gmailOnlyNangoTestEnv,
  mintCaller,
  nangoRequest,
} from "@/lib/provider-runtime/nango-route-test-fixtures";
import { buildApplyFlowNangoAccountEndUserId } from "@/lib/provider-runtime/nango-account-identity";
import { NANGO_ROUTE_ACCOUNT_ID, nangoRouteAuth } from "@/lib/provider-runtime/nango-route-account-mock";

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

vi.mock("@/lib/persistence-v2/require-applyflow-account", () =>
  import("@/lib/provider-runtime/nango-route-account-mock"),
);

import { POST } from "./route";

const URL = "http://localhost/provider-runtime/nango/connection-status";

describe("POST /provider-runtime/nango/connection-status", () => {
  beforeEach(() => {
    nangoRouteAuth.signedIn = true;
    listConnections.mockReset();
    listConnections.mockResolvedValue({ connections: [{ errors: [] }] });
  });

  it("rejects an unauthenticated account before listing connections", async () => {
    nangoRouteAuth.signedIn = false;
    const response = await POST(
      nangoRequest({ url: URL, body: { provider: "gmail", explicitConsent: true } }),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).warnings).toContain("unauthenticated");
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

  it("lists only the authenticated account tag, not a client end user id", async () => {
    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        cookie: minted.cookieHeader,
        body: {
          provider: "gmail",
          explicitConsent: true,
          endUserId: buildApplyFlowNangoAccountEndUserId("gmail", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
        },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state).toBe("connected");
    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-mail",
      tags: { end_user_id: buildApplyFlowNangoAccountEndUserId("gmail", NANGO_ROUTE_ACCOUNT_ID) },
      limit: 10,
    });
    expect(body.legacyBrowserIdentityIgnored).toBe(true);
  });
});
