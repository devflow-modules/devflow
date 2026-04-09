import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockUpsertAgentOperationalStatus = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
}));
vi.mock("@/modules/inbox/operationsAgentsService", () => ({
  upsertAgentOperationalStatus: (...args: unknown[]) => mockUpsertAgentOperationalStatus(...args),
}));

describe("PATCH /api/agents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
  });

  it("retorna 403 ao alterar outro utilizador sem ser gestor", async () => {
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/agents/u-other", {
      method: "PATCH",
      body: JSON.stringify({ status: "busy" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "u-other" }) });
    expect(res.status).toBe(403);
  });

  it("atualiza estado operacional do próprio utilizador", async () => {
    mockUpsertAgentOperationalStatus.mockResolvedValue(true);
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/agents/u1", {
      method: "PATCH",
      body: JSON.stringify({ status: "busy" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(mockUpsertAgentOperationalStatus).toHaveBeenCalledWith("t1", "u1", "busy");
  });
});

describe("DELETE /api/agents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
  });

  it("retorna 405", async () => {
    const { DELETE } = await import("../route");
    const req = new Request("http://localhost/api/agents/a1", { method: "DELETE" });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(405);
  });
});
