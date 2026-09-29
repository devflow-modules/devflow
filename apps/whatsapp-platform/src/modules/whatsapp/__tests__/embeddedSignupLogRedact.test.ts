import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  maskAccessTokenForLog,
  oauthExchangeFailureMessage,
  safeOAuthBodySummary,
} from "../embeddedSignupLogRedact";

describe("embeddedSignupLogRedact", () => {
  it("maskAccessTokenForLog never returns full token", () => {
    const token = "EAAG_SUPER_SECRET_TOKEN_VALUE_123456";
    const masked = maskAccessTokenForLog(token);
    expect(masked).not.toContain("SUPER_SECRET");
    expect(masked).toContain("…");
  });

  it("safeOAuthBodySummary redacts access_token from JSON", () => {
    const raw = JSON.stringify({
      access_token: "EAAG_LEAK_ME_PLEASE_1234567890",
      token_type: "bearer",
      expires_in: 3600,
    });
    const summary = safeOAuthBodySummary(raw);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("EAAG_LEAK");
    expect(serialized).not.toContain("LEAK_ME");
    expect(summary.has_access_token).toBe(true);
    expect(summary.bodyLength).toBe(raw.length);
  });

  it("oauthExchangeFailureMessage does not embed raw token body", () => {
    const raw = JSON.stringify({ access_token: "EAAG_SHOULD_NOT_APPEAR_IN_ERROR" });
    const msg = oauthExchangeFailureMessage(500, raw);
    expect(msg).not.toContain("EAAG_SHOULD_NOT");
    expect(msg).toContain("HTTP 500");
  });
});

describe("getEmbeddedSignupUserAccessTokenFromCode logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("success path logs never include raw access_token value", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.doMock("../embeddedSignupMetaEnv", () => ({
      getEmbeddedSignupMetaAppConfig: () => ({
        appId: "app123",
        appSecret: "secret",
        configId: "cfg12345678",
      }),
    }));
    vi.doMock("../whatsappEmbeddedSignupRedirectUri", () => ({
      getWhatsAppEmbeddedSignupRedirectUri: () => "https://example.com/cb",
    }));
    vi.doMock("../embeddedSignupGraphQueries", () => ({
      getMetaGraphBase: () => "https://graph.facebook.com/v21.0",
    }));

    const token = "EAAG_OAUTH_USER_TOKEN_VALUE_XYZ";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: token }), { status: 200 });
        }
        if (String(url).includes("/debug_token")) {
          return new Response(
            JSON.stringify({ data: { app_id: "app123", type: "USER", scopes: [], is_valid: true } }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 404 });
      })
    );

    const { getEmbeddedSignupUserAccessTokenFromCode } = await import("../embeddedSignupOAuthExchange");
    const result = await getEmbeddedSignupUserAccessTokenFromCode("authcode");
    expect(result.userAccessToken).toBe(token);

    const allLogs = [...infoSpy.mock.calls, ...errorSpy.mock.calls]
      .map((c) => c.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "))
      .join("\n");
    expect(allLogs).not.toContain(token);
    expect(allLogs).not.toContain("bodyPreview");
  });
});
