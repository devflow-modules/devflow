import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetOrCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});
vi.mock("@/modules/ai/aiAutomationService", () => ({
  getOrCreateAiAgentConfig: (...a: unknown[]) => mockGetOrCreate(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiAgentConfig: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    tenant: {
      findUnique: (...a: unknown[]) => mockTenantFindUnique(...a),
    },
    auditLog: {
      create: (...a: unknown[]) => mockAuditCreate(...a),
    },
  },
}));

function baseRow(over: Record<string, unknown> = {}) {
  return {
    id: "cfg1",
    tenantId: "t-ai",
    enabled: false,
    model: "gpt-4o-mini",
    tone: "NEUTRAL",
    maxTokens: 512,
    temperature: 0.7,
    fallbackToHuman: true,
    assistantName: null,
    businessContext: null,
    goal: null,
    rules: [] as string[],
    forbiddenTopics: [] as string[],
    handoffTriggers: [] as string[],
    autoReply: true,
    outOfHoursReply: null,
    runtimeDriver: null,
    configVersion: 1,
    updatedByUserId: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("/api/ai/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-ai", sub: "u1", role: "manager" },
    });
    mockGetOrCreate.mockResolvedValue(baseRow());
    mockFindUnique.mockResolvedValue(baseRow());
    mockTenantFindUnique.mockResolvedValue({ aiDriver: null });
    mockAuditCreate.mockResolvedValue({});
    mockUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...baseRow(),
      ...data,
      configVersion: 2,
    }));
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
    expect(j.presets?.length).toBeGreaterThan(0);
  });

  it("GET 403 para operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-ai", sub: "u1", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/config"));
    expect(res.status).toBe(403);
  });

  it("PUT 403 para operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-ai", sub: "u1", role: "operator" },
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new NextRequest("http://x/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      })
    );
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("POST atualiza enabled", async () => {
    mockUpdate.mockResolvedValue({
      ...baseRow({
        enabled: true,
        tone: "FRIENDLY",
        businessContext: "Loja",
      }),
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new NextRequest("http://x/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, tone: "FRIENDLY", businessContext: "Loja" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "t-ai" },
        data: expect.objectContaining({ enabled: true, tone: "FRIENDLY" }),
      })
    );
  });

  it("PUT aplica clamp em temperature e maxTokens", async () => {
    mockUpdate.mockResolvedValue(baseRow({ maxTokens: 500, temperature: 1 }));
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
