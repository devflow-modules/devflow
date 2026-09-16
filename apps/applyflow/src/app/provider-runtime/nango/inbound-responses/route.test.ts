import { beforeEach, describe, expect, it, vi } from "vitest";
import { mintNangoCallerSession } from "@/lib/provider-runtime/nango-caller-session";

const enabledEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
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

function post(body: unknown, cookie?: string) {
  return new Request("http://localhost/provider-runtime/nango/inbound-responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /provider-runtime/nango/inbound-responses", () => {
  beforeEach(() => {
    handleScan.mockReset();
  });

  it("rejects missing consent before requiring a caller session", async () => {
    const response = await POST(post({ explicitConsent: false, limit: 1 }) as never);
    expect(response.status).toBe(403);
    expect(handleScan).not.toHaveBeenCalled();
  });

  it("rejects runtime-enabled scans without a caller session", async () => {
    const response = await POST(post({ explicitConsent: true, limit: 1 }) as never);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.warnings).toContain("missing_caller_session");
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
    const minted = mintNangoCallerSession("nango-secret-test", { secure: false });
    const response = await POST(post({ explicitConsent: true, limit: 1 }, minted.cookieHeader) as never);
    expect(response.status).toBe(200);
    expect(handleScan).toHaveBeenCalledOnce();
    expect(handleScan.mock.calls[0]?.[0]).toMatchObject({ callerNonce: minted.nonce });
  });
});
