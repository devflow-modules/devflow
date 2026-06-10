import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

vi.mock("@/lib/lead-pilot-conversion", () => ({
  convertLeadToPilotSchema: z.object({
    tenantId: z.string().trim().min(1).max(128),
    confirm: z.literal(true),
    internalOwner: z.string().trim().max(200).optional(),
  }),
  convertLeadToWhatsappPilot: vi.fn(),
}));

import { convertLeadToWhatsappPilot } from "@/lib/lead-pilot-conversion";
import { POST } from "../route";

const authHeaders = { "x-admin-metrics-secret": "convert-secret" };

describe("POST /api/admin/leads/:id/convert", () => {
  beforeEach(() => {
    process.env.ADMIN_METRICS_SECRET = "convert-secret";
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(convertLeadToWhatsappPilot).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("403 sem autorização", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/leads/1/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "t1", confirm: true }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("400 sem tenantId ou confirmação", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/leads/1/convert", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "t1", confirm: false }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
    expect(convertLeadToWhatsappPilot).not.toHaveBeenCalled();
  });

  it("200 converte com tenantId e confirm", async () => {
    vi.mocked(convertLeadToWhatsappPilot).mockResolvedValue({
      id: "1",
      convertedToRef: "tenant-abc",
      convertedToType: "whatsapp_platform",
    } as never);

    const res = await POST(
      new Request("http://localhost/api/admin/leads/1/convert", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "tenant-abc", confirm: true, internalOwner: "Ops" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(200);
    expect(convertLeadToWhatsappPilot).toHaveBeenCalledWith("1", {
      tenantId: "tenant-abc",
      confirm: true,
      internalOwner: "Ops",
    });
  });
});
