import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/lead-pilot-conversion", () => ({
  listWhatsappPilotTenantsForAdmin: vi.fn(),
}));

import { listWhatsappPilotTenantsForAdmin } from "@/lib/lead-pilot-conversion";
import { GET } from "../route";

const authHeaders = { "x-admin-metrics-secret": "tenants-secret" };

describe("GET /api/admin/leads/whatsapp-tenants", () => {
  beforeEach(() => {
    process.env.ADMIN_METRICS_SECRET = "tenants-secret";
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(listWhatsappPilotTenantsForAdmin).mockReset();
  });

  it("403 sem autorização", async () => {
    const res = await GET(new Request("http://localhost/api/admin/leads/whatsapp-tenants"));
    expect(res.status).toBe(403);
  });

  it("200 lista tenants", async () => {
    vi.mocked(listWhatsappPilotTenantsForAdmin).mockResolvedValue([
      { id: "t1", name: "Piloto A", gtmLifecycle: "AVALIACAO", whatsappPhone: null },
    ]);

    const res = await GET(
      new Request("http://localhost/api/admin/leads/whatsapp-tenants", { headers: authHeaders })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenants: Array<{ id: string }> };
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0]?.id).toBe("t1");
  });
});
