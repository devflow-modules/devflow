import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const createSupabaseServerClient = vi.fn();
const resolveApplyFlowSupabasePublicConfig = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: (...args: unknown[]) => createSupabaseServerClient(...args),
}));

vi.mock("@/lib/persistence-v2/env", () => ({
  resolveApplyFlowSupabasePublicConfig: (...args: unknown[]) =>
    resolveApplyFlowSupabasePublicConfig(...args),
}));

import { GET } from "./route";

function requestWith(search: string): NextRequest {
  return new NextRequest(`http://localhost:3010/auth/callback${search}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    createSupabaseServerClient.mockReset();
    resolveApplyFlowSupabasePublicConfig.mockReset();
    resolveApplyFlowSupabasePublicConfig.mockReturnValue({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
    createSupabaseServerClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });
  });

  it("redirects to login when code is missing", async () => {
    const res = await GET(requestWith("?next=/account"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3010/login?error=missing_code",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges code and redirects to safe next", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(requestWith("?code=abc&next=%2Faccount"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3010/account");
  });

  it("rejects open redirect next and uses default account path", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(requestWith("?code=abc&next=https%3A%2F%2Fevil.example"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3010/account");
  });

  it("rejects protocol-relative next", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(requestWith("?code=abc&next=%2F%2Fevil.example"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3010/account");
  });

  it("redirects to login when exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    const res = await GET(requestWith("?code=bad"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3010/login?error=exchange_failed",
    );
  });

  it("redirects when auth is not configured", async () => {
    resolveApplyFlowSupabasePublicConfig.mockReturnValue(null);
    const res = await GET(requestWith("?code=abc"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3010/login?error=auth_not_configured",
    );
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
