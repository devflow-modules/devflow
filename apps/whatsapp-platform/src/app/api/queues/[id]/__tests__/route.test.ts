import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockUpdateOperationalQueue = vi.fn();
const mockDeleteOperationalQueue = vi.fn();
const mockGetTenantPlan = vi.fn();

vi.mock("@/modules/billing/subscriptionService", () => ({
  getTenantPlan: (...args: unknown[]) => mockGetTenantPlan(...args),
}));

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});
vi.mock("@/modules/inbox/inboxOperationalQueueService", () => ({
  updateOperationalQueue: (...args: unknown[]) => mockUpdateOperationalQueue(...args),
  deleteOperationalQueue: (...args: unknown[]) => mockDeleteOperationalQueue(...args),
}));

describe("PATCH /api/queues/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
    mockGetTenantPlan.mockResolvedValue("PRO");
  });

  it("retorna 403 quando operador tenta PATCH", async () => {
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "operator" } });
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Fila 1" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 403 FEATURE_NOT_AVAILABLE quando plano sem filas", async () => {
    mockGetTenantPlan.mockResolvedValue("STARTER");
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Fila 1" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("FEATURE_NOT_AVAILABLE");
    expect(data.feature).toBe("QUEUES_TAGS");
    expect(mockUpdateOperationalQueue).not.toHaveBeenCalled();
  });

  it("retorna 404 quando fila não existe", async () => {
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
    mockUpdateOperationalQueue.mockResolvedValue(null);
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Fila 1" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Fila não encontrada");
  });

  it("atualiza fila e retorna 200", async () => {
    mockUpdateOperationalQueue.mockResolvedValue({
      id: "q1",
      name: "Nova",
      slug: "nova",
      description: null,
      color: null,
      slaTargetMinutes: null,
      isActive: true,
    });
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Nova" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.queue.name).toBe("Nova");
    expect(mockUpdateOperationalQueue).toHaveBeenCalledWith("t1", "q1", { name: "Nova" });
  });
});

describe("DELETE /api/queues/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
    mockGetTenantPlan.mockResolvedValue("PRO");
  });

  it("retorna 404 quando fila não existe", async () => {
    mockDeleteOperationalQueue.mockResolvedValue(false);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(404);
  });

  it("remove fila e retorna success", async () => {
    mockDeleteOperationalQueue.mockResolvedValue(true);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeleteOperationalQueue).toHaveBeenCalledWith("t1", "q1");
  });
});
