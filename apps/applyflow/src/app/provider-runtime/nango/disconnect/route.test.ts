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
const deleteConnection = vi.fn();

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function MockNango() {
    return { listConnections, deleteConnection };
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

const URL = "http://localhost/provider-runtime/nango/disconnect";

describe("POST /provider-runtime/nango/disconnect", () => {
  beforeEach(() => {
    nangoRouteAuth.signedIn = true;
    listConnections.mockReset();
    deleteConnection.mockReset();
  });

  it("rejects an unauthenticated account before listing or deleting", async () => {
    nangoRouteAuth.signedIn = false;
    const response = await POST(
      nangoRequest({ url: URL, body: { provider: "gmail", explicitConfirmation: true } }),
    );
    expect(response.status).toBe(401);
    expect(listConnections).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it("rejects a foreign Origin before listing or deleting", async () => {
    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        origin: "https://evil.example",
        cookie: minted.cookieHeader,
        body: { provider: "gmail", explicitConfirmation: true },
      }),
    );
    expect(response.status).toBe(403);
    expect(listConnections).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it("does not let session A delete session B connections", async () => {
    listConnections.mockImplementation(async (input: { tags: { end_user_id: string } }) => {
      if (input.tags.end_user_id === buildApplyFlowNangoAccountEndUserId("gmail", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")) {
        return { connections: [{ connection_id: "conn-b" }] };
      }
      return { connections: [] };
    });

    const minted = mintCaller(CALLER_NONCE_A);
    const response = await POST(
      nangoRequest({
        url: URL,
        cookie: minted.cookieHeader,
        body: {
          provider: "gmail",
          explicitConfirmation: true,
          connectionId: "conn-b",
          accountScope: "scope-b",
        },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.previouslyConnected).toBe(false);
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-mail",
      tags: { end_user_id: buildApplyFlowNangoAccountEndUserId("gmail", NANGO_ROUTE_ACCOUNT_ID) },
      limit: 10,
    });
  });
});
