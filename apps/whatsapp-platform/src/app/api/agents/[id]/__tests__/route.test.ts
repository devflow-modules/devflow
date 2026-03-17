import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockGetAgentById = vi.fn();
const mockUpdateAgent = vi.fn();
const mockDeleteAgent = vi.fn();

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/modules/agents", () => ({
  getAgentById: (...args: unknown[]) => mockGetAgentById(...args),
  updateAgent: (...args: unknown[]) => mockUpdateAgent(...args),
  deleteAgent: (...args: unknown[]) => mockDeleteAgent(...args),
}));

describe("DELETE /api/agents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "admin" } });
  });

  it("retorna 404 quando agente não existe", async () => {
    mockGetAgentById.mockResolvedValue(null);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/agents/a1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Agente não encontrado");
  });

  it("remove agente e retorna success", async () => {
    mockGetAgentById.mockResolvedValue({ id: "a1", tenant_id: "t1", name: "Agente" });
    mockDeleteAgent.mockResolvedValue(undefined);
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/agents/a1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeleteAgent).toHaveBeenCalledWith("a1");
  });
});
