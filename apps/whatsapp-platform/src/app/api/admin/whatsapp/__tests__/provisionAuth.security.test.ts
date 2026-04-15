import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { logEvent } from "@/lib/observability/log-event";
import { getAuthFromRequest } from "@/modules/auth";
import { authorizeProvisionOrPlatformAdmin } from "../provisionAuth";

vi.mock("@/lib/observability/log-event", () => ({ logEvent: vi.fn() }));
vi.mock("@/modules/auth", () => ({ getAuthFromRequest: vi.fn() }));

function req(path = "/api/admin/tenants/x", headers?: Record<string, string>): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: new URL(`http://localhost${path}`),
    method: "GET",
  } as unknown as NextRequest;
}

describe("authorizeProvisionOrPlatformAdmin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.mocked(getAuthFromRequest).mockReset();
  });

  it("autoriza com Bearer correto sem log de negação", async () => {
    vi.stubEnv("WHATSAPP_MANUAL_PROVISION_SECRET", "segredo-teste");
    const ok = await authorizeProvisionOrPlatformAdmin(
      req("/api/admin/x", { authorization: "Bearer segredo-teste" })
    );
    expect(ok).toBe(true);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("nega sessão não admin e regista evento de segurança", async () => {
    vi.stubEnv("WHATSAPP_MANUAL_PROVISION_SECRET", "");
    vi.mocked(getAuthFromRequest).mockResolvedValue({
      payload: {
        sub: "u1",
        tenantId: "t1",
        role: "manager",
        email: "a@b.c",
        name: "A",
        jti: "j1",
        iat: 1,
        exp: 9,
      },
      token: "t",
      sessionId: "j1",
    } as Awaited<ReturnType<typeof getAuthFromRequest>>);
    const ok = await authorizeProvisionOrPlatformAdmin(req("/api/admin/tenants/c1"));
    expect(ok).toBe(false);
    expect(logEvent).toHaveBeenCalledWith(
      "warn",
      "security",
      "admin_provision_auth_denied",
      expect.objectContaining({
        path: "/api/admin/tenants/c1",
        method: "GET",
        has_session: true,
        role: "manager",
      })
    );
  });

  it("nega sem sessão e regista evento", async () => {
    vi.stubEnv("WHATSAPP_MANUAL_PROVISION_SECRET", "");
    vi.mocked(getAuthFromRequest).mockResolvedValue(null);
    const ok = await authorizeProvisionOrPlatformAdmin(req());
    expect(ok).toBe(false);
    expect(logEvent).toHaveBeenCalledWith(
      "warn",
      "security",
      "admin_provision_auth_denied",
      expect.objectContaining({ has_session: false, role: null })
    );
  });

  it("autoriza platform_admin sem log de negação", async () => {
    vi.stubEnv("WHATSAPP_MANUAL_PROVISION_SECRET", "");
    vi.mocked(getAuthFromRequest).mockResolvedValue({
      payload: {
        sub: "u1",
        tenantId: "t1",
        role: "platform_admin",
        email: "a@b.c",
        name: "A",
        jti: "j1",
        iat: 1,
        exp: 9,
      },
      token: "t",
      sessionId: "j1",
    } as Awaited<ReturnType<typeof getAuthFromRequest>>);
    const ok = await authorizeProvisionOrPlatformAdmin(req());
    expect(ok).toBe(true);
    expect(logEvent).not.toHaveBeenCalled();
  });
});
