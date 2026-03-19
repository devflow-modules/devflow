import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuth = vi.fn();
const mockGetOrCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
}));
vi.mock("@/modules/ai/aiAutomationService", () => ({
  getOrCreateAiAgentConfig: (...a: unknown[]) => mockGetOrCreate(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiAgentConfig: {
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

describe("/api/ai/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-ai", sub: "u1", role: "admin" },
    });
    mockGetOrCreate.mockResolvedValue({
      enabled: false,
      systemPrompt: "",
      tone: "NEUTRAL",
      maxTokens: 512,
      temperature: 0.7,
      fallbackToHuman: true,
    });
  });

  it("GET 401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new Request("http://x/api/ai/config") as never);
    expect(res.status).toBe(401);
  });

  it("GET retorna config", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://x/api/ai/config") as never);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.tone).toBe("NEUTRAL");
  });

  it("POST atualiza enabled", async () => {
    mockUpdate.mockResolvedValue({
      enabled: true,
      systemPrompt: "Olá",
      tone: "FRIENDLY",
      maxTokens: 400,
      temperature: 0.6,
      fallbackToHuman: true,
    });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://x/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, systemPrompt: "Olá", tone: "FRIENDLY" }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "t-ai" },
        data: expect.objectContaining({ enabled: true, systemPrompt: "Olá" }),
      })
    );
  });
});
