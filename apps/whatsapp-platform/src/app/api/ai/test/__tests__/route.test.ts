import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiTestRateLimitBucketsForTest } from "@/lib/aiTestRateLimit";

const mockGetAuth = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

const mockSimulation = vi.fn();
vi.mock("@/modules/ai/aiTestSimulation", () => ({
  mergeAgentConfigDraft: (base: unknown, d: unknown) => ({
    ...(base as Record<string, unknown>),
    ...(d as Record<string, unknown>),
  }),
  runAiConfigTestSimulation: (...a: unknown[]) => mockSimulation(...a),
}));

const mockGetOrCreate = vi.fn();
vi.mock("@/modules/ai/aiAutomationService", () => ({
  getOrCreateAiAgentConfig: (...a: unknown[]) => mockGetOrCreate(...a),
}));

const mockTenantFind = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: (...a: unknown[]) => mockTenantFind(...a) },
  },
}));

const trackAiUsage = vi.hoisted(() => vi.fn());
vi.mock("@/modules/ai/aiUsageService", () => ({
  trackAiUsage: (...a: unknown[]) => trackAiUsage(...a),
}));

const baseSimulation = {
  reply: "Olá!",
  usedDriver: "openAI",
  usedModel: "gpt-4o-mini",
  fallback: false,
  latencyMs: 50,
  decision: { allow: true, reason: "ok", confidence: 0.95 as number | undefined },
  playbookState: "lead" as const,
};

describe("POST /api/ai/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiTestRateLimitBucketsForTest();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "manager" },
    });
    mockGetOrCreate.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      enabled: true,
      systemPrompt: "x",
      tone: "NEUTRAL",
      model: "gpt-4o-mini",
      maxTokens: 200,
      temperature: 0.4,
      fallbackToHuman: true,
      rules: [],
      forbiddenTopics: [],
      handoffTriggers: [],
      autoReply: true,
      assistantName: null,
      businessContext: null,
      goal: null,
      outOfHoursReply: null,
      runtimeDriver: null,
      configVersion: 1,
      updatedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTenantFind.mockResolvedValue({ aiDriver: "openAI" });
    mockSimulation.mockResolvedValue({ ...baseSimulation });
  });

  it("403 para operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "oi" }),
      })
    );
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe("Acesso negado");
  });

  it("200 para platform_admin", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "platform_admin" },
    });
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "oi" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("200 com contrato completo: tipos, campos obrigatórios e driver normalizado", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Bom dia" }),
      })
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: {
        reply: string;
        decision: { allow: boolean; reason: string; confidence: number | null };
        state: string;
        usedDriver: string;
        usedModel: string;
        latencyMs: number;
        fallback: boolean;
        error: string | null;
      };
    };
    expect(j.success).toBe(true);
    expect(typeof j.data.reply).toBe("string");
    expect(j.data.decision.allow).toBe(true);
    expect(typeof j.data.decision.reason).toBe("string");
    expect(j.data.decision.confidence).not.toBeUndefined();
    expect(["lead", "negotiating", "support", "closed"]).toContain(j.data.state);
    expect(j.data.usedDriver).toBe("openai");
    expect(typeof j.data.usedModel).toBe("string");
    expect(typeof j.data.latencyMs).toBe("number");
    expect(j.data.fallback).toBe(false);
    expect(j.data.error).toBe(null);
    expect(mockSimulation).toHaveBeenCalled();
  });

  it("decision bloqueada: allow false, fallback true, reply vazio", async () => {
    mockSimulation.mockResolvedValue({
      reply: "",
      usedDriver: "ruleBased",
      usedModel: "gpt-4o-mini",
      fallback: true,
      latencyMs: 0,
      error: "sensitive_keyword:cancelar",
      decision: { allow: false, reason: "sensitive_keyword:cancelar", confidence: 1 },
      playbookState: "lead",
    });
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "quero cancelar" }),
      })
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { data: { decision: { allow: boolean }; fallback: boolean } };
    expect(j.data.decision.allow).toBe(false);
    expect(j.data.fallback).toBe(true);
  });

  it("429 quando rate limit de teste é excedido", async () => {
    const { POST } = await import("../route");
    for (let i = 0; i < 12; i++) {
      const res = await POST(
        new NextRequest("http://x/api/ai/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `m${i}` }),
        })
      );
      expect(res.status).toBe(200);
    }
    const res429 = await POST(
      new NextRequest("http://x/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "extra" }),
      })
    );
    expect(res429.status).toBe(429);
  });
});

describe("buildAiTestResponseBody / normalizeAiTestUsedDriver", () => {
  it("normaliza drivers internos para o contrato público", async () => {
    const { buildAiTestResponseBody, normalizeAiTestUsedDriver } = await import("../route");
    expect(normalizeAiTestUsedDriver("openAI")).toBe("openai");
    expect(normalizeAiTestUsedDriver("claude")).toBe("anthropic");
    expect(normalizeAiTestUsedDriver("ruleBased")).toBe("rules");

    const body = buildAiTestResponseBody({
      reply: "x",
      usedDriver: "claude",
      usedModel: "claude-3",
      fallback: false,
      latencyMs: 12,
      decision: { allow: true, reason: "ok" },
      playbookState: "negotiating",
    });
    expect(body.usedDriver).toBe("anthropic");
    expect(body.latencyMs).toBe(12);
    expect(body.decision.confidence).toBe(null);
    expect(body.error).toBe(null);
  });
});
