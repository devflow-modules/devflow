import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockFromCookies = vi.fn();
const mockFromRequest = vi.fn();

vi.mock("@/lib/crm-whatsapp-auth", () => ({
  getCrmWhatsappSessionFromCookies: () => mockFromCookies(),
  getCrmWhatsappSessionFromRequest: (r: Request) => mockFromRequest(r),
}));

describe("admin-leads-api-auth — isAdminLeadsApiAllowed", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ADMIN_METRICS_SECRET = "metrics-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dev: permite sem credenciais", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { isAdminLeadsApiAllowed } = await import("../admin-leads-api-auth");
    const ok = await isAdminLeadsApiAllowed(new NextRequest("http://localhost/api/admin/leads"));
    expect(ok).toBe(true);
  });

  it("prod: permite com x-admin-metrics-secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { isAdminLeadsApiAllowed } = await import("../admin-leads-api-auth");
    const req = new NextRequest("http://localhost/api/admin/leads", {
      headers: { "x-admin-metrics-secret": "metrics-secret" },
    });
    expect(await isAdminLeadsApiAllowed(req)).toBe(true);
  });

  it("prod: permite com JWT platform_admin (Request)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockFromCookies.mockResolvedValue(null);
    mockFromRequest.mockResolvedValue({
      sub: "u1",
      tenantId: "t1",
      email: "a@b.c",
      name: "A",
      role: "platform_admin",
    });
    const { isAdminLeadsApiAllowed } = await import("../admin-leads-api-auth");
    const req = new NextRequest("http://localhost/api/admin/leads");
    expect(await isAdminLeadsApiAllowed(req)).toBe(true);
  });

  it("prod: nega manager", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockFromCookies.mockResolvedValue(null);
    mockFromRequest.mockResolvedValue({
      sub: "u1",
      tenantId: "t1",
      email: "m@b.c",
      name: "M",
      role: "manager",
    });
    const { isAdminLeadsApiAllowed } = await import("../admin-leads-api-auth");
    const req = new NextRequest("http://localhost/api/admin/leads");
    expect(await isAdminLeadsApiAllowed(req)).toBe(false);
  });
});
