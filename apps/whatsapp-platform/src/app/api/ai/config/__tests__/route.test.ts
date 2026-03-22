import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
      model: "gpt-4o-mini",
      tone: "NEUTRAL",
      maxTokens: 512,
      temperature: 0.7,
      fallbackToHuman: true,
    });
  });

  it("GET 401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/config"));
    expect(res.status).toBe(401);
  });

  it("GET retorna config", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/config"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.tone).toBe("NEUTRAL");
    expect(j.data.model).toBe("gpt-4o-mini");
  });

  it("POST atualiza enabled", async () => {
    mockUpdate.mockResolvedValue({
      enabled: true,
      systemPrompt: "Olá",
      model: "gpt-4o-mini",
      tone: "FRIENDLY",
      maxTokens: 400,
      temperature: 0.6,
      fallbackToHuman: true,
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new NextRequest("http://x/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, systemPrompt: "Olá", tone: "FRIENDLY" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "t-ai" },
        data: expect.objectContaining({ enabled: true, systemPrompt: "Olá" }),
      })
    );
  });

  it("PUT aplica clamp em temperature e maxTokens", async () => {
    mockUpdate.mockResolvedValue({
      enabled: true,
      systemPrompt: "",
      model: "gpt-4o-mini",
      tone: "NEUTRAL",
      maxTokens: 300,
      temperature: 0.5,
      fallbackToHuman: true,
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new NextRequest("http://x/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature: 5, maxTokens: 9999 }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          temperature: 1,
          maxTokens: 500,
        }),
      })
    );
  });
});
