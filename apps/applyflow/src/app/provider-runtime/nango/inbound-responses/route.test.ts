import { beforeEach, describe, expect, it, vi } from "vitest";
import { mintCaller, nangoRequest } from "@/lib/provider-runtime/nango-route-test-fixtures";

const enabledEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
  NODE_ENV: "test",
};

vi.mock("@/lib/provider-runtime/nango-connect-session-launcher", () => ({
  readApplyFlowNangoConnectSessionEnv: () => enabledEnv,
}));

const handleScan = vi.fn();

vi.mock("@/lib/provider-runtime/gmail-closed-loop-inbound-boundary", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/provider-runtime/gmail-closed-loop-inbound-boundary")
  >("@/lib/provider-runtime/gmail-closed-loop-inbound-boundary");
  return {
    ...actual,
    handleGmailClosedLoopInboundScan: (...args: unknown[]) => handleScan(...args),
  };
});

import { POST } from "./route";

const URL = "http://localhost/provider-runtime/nango/inbound-responses";

function post(
  body: unknown,
  options?: { cookie?: string; origin?: string | null | "omit" },
) {
  return nangoRequest({
    url: URL,
    body,
    cookie: options?.cookie,
    origin: options?.origin,
  });
}

describe("POST /provider-runtime/nango/inbound-responses", () => {
  beforeEach(() => {
    handleScan.mockReset();
  });

  it("rejects missing consent before requiring a caller session", async () => {
    const response = await POST(post({ explicitConsent: false, limit: 1 }, { origin: "omit" }));
    expect(response.status).toBe(403);
    expect(handleScan).not.toHaveBeenCalled();
  });

  it("rejects runtime-enabled scans without a caller session", async () => {
    const response = await POST(post({ explicitConsent: true, limit: 1 }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.warnings).toContain("missing_caller_session");
    expect(handleScan).not.toHaveBeenCalled();
  });

  it("rejects a foreign Origin before scanning", async () => {
    const minted = mintCaller("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const response = await POST(
      post(
        { explicitConsent: true, limit: 1 },
        { cookie: minted.cookieHeader, origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).warnings).toContain("cross_origin_forbidden");
    expect(handleScan).not.toHaveBeenCalled();
  });

  it("forwards the caller nonce when the session cookie is valid", async () => {
    handleScan.mockResolvedValue({
      status: "blocked",
      emails: [],
      accountScopes: [],
      warnings: ["provider_runtime_disabled"],
      readOnly: true,
      safeForClient: true,
    });
    const minted = mintCaller("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const response = await POST(
      post({ explicitConsent: true, limit: 1, endUserId: "applyflow-gmail-runtime-boundary" }, {
        cookie: minted.cookieHeader,
      }),
    );
    expect(response.status).toBe(200);
    expect(handleScan).toHaveBeenCalledOnce();
    expect(handleScan.mock.calls[0]?.[0]).toMatchObject({ callerNonce: minted.nonce });
    expect(handleScan.mock.calls[0]?.[0]).not.toMatchObject({
      callerNonce: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });
});
