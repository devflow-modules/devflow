import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockRequireRole = vi.fn(
  (auth: { payload?: { role?: string } } | null, allowed: string[]) => {
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }
    const role = auth.payload?.role;
    if (!role || !allowed.includes(role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403 });
    }
    return null;
  }
);
const mockRunBatch = vi.fn();
const mockRecordPlatformAudit = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (req: unknown) => mockGetAuthFromRequest(req),
  requireRole: (
    auth: { payload?: { role?: string } } | null,
    allowed: string[]
  ) => mockRequireRole(auth, allowed),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/modules/automation/timeElapsedRunner", () => ({
  runTimeElapsedRulesBatch: (opts?: unknown) => mockRunBatch(opts),
}));

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: (input: unknown) => mockRecordPlatformAudit(input),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
}));

function req(body?: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/automation/run-rules", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const okBatch = { tenants: 1, threadsScanned: 2, rulesWithSuccess: 1 };

describe("P0 — POST /api/automation/run-rules authz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.CRON_SECRET;
    delete process.env.BILLING_CRON_SECRET;
    mockRunBatch.mockResolvedValue(okBatch);
    mockGetAuthFromRequest.mockResolvedValue(null);
  });

  it("sem sessão e sem cron → 401 e não executa batch", async () => {
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(401);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });

  it("operator no próprio tenant → 403", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u-op", role: "operator" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(403);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });

  it("role inválida → 403", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u1", role: "viewer" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(403);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });

  it("usuário sem tenant → 400 fail-closed", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "", sub: "u1", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });

  it("manager no próprio tenant → 200 e batch só com tenant da sessão", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u-mgr", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({ threadLimit: 10 }));
    expect(res.status).toBe(200);
    expect(mockRunBatch).toHaveBeenCalledWith({
      tenantId: "t-a",
      threadLimit: 10,
    });
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "automation.run_rules",
        tenantId: "t-a",
        userId: "u-mgr",
        metadata: expect.objectContaining({
          via: "session",
          role: "manager",
          result: "ok",
        }),
      })
    );
  });

  it("manager A com body.tenantId de B → 403 e não executa", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u-mgr", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({ tenantId: "t-b" }));
    expect(res.status).toBe(403);
    expect(mockRunBatch).not.toHaveBeenCalled();
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ result: "forbidden_cross_tenant" }),
      })
    );
  });

  it("tenantId omitido pelo manager → usa sessão, nunca all-tenants", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u-mgr", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(mockRunBatch).toHaveBeenCalledWith({
      tenantId: "t-a",
      threadLimit: undefined,
    });
  });

  it("platform_admin sessão → batch só no tenant da sessão (não plataforma global)", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-home", sub: "u-pa", role: "platform_admin" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({ tenantId: "t-other" }));
    expect(res.status).toBe(403);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });

  it("platform_admin no próprio tenant → 200 scoped", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-home", sub: "u-pa", role: "platform_admin" },
    });
    const { POST } = await import("../route");
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(mockRunBatch).toHaveBeenCalledWith({
      tenantId: "t-home",
      threadLimit: undefined,
    });
  });

  it("cron Bearer → pode omitir tenantId (all tenants) sem sessão", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(
      req({}, { authorization: "Bearer cron-test-secret" })
    );
    expect(res.status).toBe(200);
    expect(mockGetAuthFromRequest).not.toHaveBeenCalled();
    expect(mockRunBatch).toHaveBeenCalledWith({
      tenantId: undefined,
      threadLimit: undefined,
    });
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ via: "cron", scope: "all_tenants" }),
      })
    );
  });

  it("cron Bearer com tenantId explícito → single tenant", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    const { POST } = await import("../route");
    const res = await POST(
      req({ tenantId: "t-ops" }, { authorization: "Bearer cron-test-secret" })
    );
    expect(res.status).toBe(200);
    expect(mockRunBatch).toHaveBeenCalledWith({
      tenantId: "t-ops",
      threadLimit: undefined,
    });
  });

  it("Bearer cron inválido + manager → trata como sessão (não eleva a cron)", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t-a", sub: "u-mgr", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(
      req({ tenantId: "t-b" }, { authorization: "Bearer wrong" })
    );
    expect(res.status).toBe(403);
    expect(mockRunBatch).not.toHaveBeenCalled();
  });
});
