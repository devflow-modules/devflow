import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockGetQueueById = vi.fn();
const mockUpdateQueue = vi.fn();
const mockDeleteQueue = vi.fn();

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/modules/queues", () => ({
  getQueueById: (...args: unknown[]) => mockGetQueueById(...args),
  updateQueue: (...args: unknown[]) => mockUpdateQueue(...args),
  deleteQueue: (...args: unknown[]) => mockDeleteQueue(...args),
}));

describe("PATCH /api/queues/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "admin" } });
  });

  it("retorna 404 quando fila não existe", async () => {
    mockGetQueueById.mockResolvedValue(null);
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
    mockGetQueueById.mockResolvedValue({ id: "q1", tenant_id: "t1", name: "Antiga", slug: "antiga" });
    mockUpdateQueue.mockResolvedValue({ id: "q1", name: "Nova", slug: "antiga", max_size: 10 });
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Nova", max_size: 10 }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Nova");
    expect(mockUpdateQueue).toHaveBeenCalledWith("q1", { name: "Nova", max_size: 10 });
  });
});

describe("DELETE /api/queues/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "admin" } });
  });

  it("retorna 404 quando fila não existe", async () => {
    mockGetQueueById.mockResolvedValue(null);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(404);
  });

  it("remove fila e retorna success", async () => {
    mockGetQueueById.mockResolvedValue({ id: "q1", tenant_id: "t1" });
    mockDeleteQueue.mockResolvedValue(undefined);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/queues/q1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "q1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeleteQueue).toHaveBeenCalledWith("q1");
  });
});
