import { beforeEach, describe, expect, it, vi } from "vitest";

const createConnectSession = vi.fn(async () => ({
  data: { token: "nango-session-token-should-not-leak" },
}));

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function MockNango() {
    return {
      createConnectSession,
    };
  }),
}));

import { createNangoServerConnectSessionProvider, createNangoServerOAuthUrlProvider, buildApplyFlowNangoEndUserId } from "./nango-server-provider.js";

const CALLER_NONCE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("createNangoServerOAuthUrlProvider", () => {
  beforeEach(() => {
    createConnectSession.mockClear();
  });

  it("creates a Nango connect session server-side and returns a launcher URL only", async () => {
    const provider = createNangoServerOAuthUrlProvider({
      secretKey: "server-only-secret",
      callerNonce: CALLER_NONCE,
      connectLauncherBasePath: "/provider-runtime/nango/connect",
    });

    const url = await provider.createAuthorizationUrl({
      provider: "gmail",
      redirectUri: "https://applyflow.example/oauth/callback",
    });

    expect(createConnectSession).toHaveBeenCalledWith({
      tags: {
        end_user_id: buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE),
      },
      allowed_integrations: ["google-mail"],
    });
    expect(url).toBe(
      "/provider-runtime/nango/connect?provider=gmail&redirect_uri=https%3A%2F%2Fapplyflow.example%2Foauth%2Fcallback",
    );
    expect(url).not.toMatch(/nango-session-token|server-only-secret|access_token/i);
  });

  it("returns client-safe connect session token from connect session provider", async () => {
    const provider = createNangoServerConnectSessionProvider({
      secretKey: "server-only-secret",
      callerNonce: CALLER_NONCE,
    });

    const session = await provider.createConnectSession({ provider: "gmail" });

    expect(createConnectSession).toHaveBeenCalledOnce();
    expect(session.connectSessionUrl).toBe("/provider-runtime/nango/connect?provider=gmail");
    expect(session.connectSessionToken).toBe("nango-session-token-should-not-leak");
    expect(JSON.stringify(session)).not.toMatch(/server-only-secret|access_token|refresh_token/i);
  });

  it("maps calendar provider to google-calendar integration", async () => {
    const provider = createNangoServerOAuthUrlProvider({
      secretKey: "server-only-secret",
      callerNonce: CALLER_NONCE,
    });

    await provider.createAuthorizationUrl({ provider: "calendar" });

    expect(createConnectSession).toHaveBeenCalledWith({
      tags: {
        end_user_id: buildApplyFlowNangoEndUserId("calendar", CALLER_NONCE),
      },
      allowed_integrations: ["google-calendar"],
    });
  });

  it("scopes Gmail and Calendar connections to the caller nonce, not a shared boundary", async () => {
    const otherNonce = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE)).not.toBe(
      buildApplyFlowNangoEndUserId("gmail", otherNonce),
    );
    expect(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE)).not.toBe("applyflow-gmail-runtime-boundary");
  });
});
