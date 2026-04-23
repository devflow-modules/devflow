import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma-root";
import { POST } from "../route";

const authHeaders = { "x-admin-metrics-secret": "convert-secret" };

describe("POST /api/admin/leads/:id/convert", () => {
  beforeEach(() => {
    process.env.ADMIN_METRICS_SECRET = "convert-secret";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(prisma.lead.findUnique).mockReset();
    vi.mocked(prisma.lead.update).mockReset();
  });

  it("409 se já convertido", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "1",
      convertedAt: new Date(),
      status: "fechado",
    } as never);

    const res = await POST(
      new Request("http://localhost/api/admin/leads/1/convert", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(409);
  });

  it("200 converte e define campos (whatsapp_platform)", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "1",
      convertedAt: null,
      status: "negociacao",
    } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({ id: "1" } as never);

    const res = await POST(
      new Request("http://localhost/api/admin/leads/1/convert", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "1" },
        data: expect.objectContaining({
          convertedToType: "whatsapp_platform",
          convertedToRef: null,
        }),
      })
    );
  });
});
