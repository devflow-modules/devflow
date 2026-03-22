import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAssign = vi.fn();
const mockUnassign = vi.fn();
vi.mock("@/modules/inbox", () => ({
  assignThread: (...args: unknown[]) => mockAssign(...args),
  unassignThread: (...args: unknown[]) => mockUnassign(...args),
}));

const mockAuth = vi.fn();
vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...args),
}));

describe("POST /api/inbox/conversations/[id]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ payload: { tenantId: "t1", sub: "user1" } });
    mockAssign.mockResolvedValue(true);
    mockUnassign.mockResolvedValue(true);
  });

  it("retorna 401 sem auth", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new Request("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(401);
  });

  it("atribui e retorna 200 quando body vazio (assign to me)", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockAssign).toHaveBeenCalledWith("t1", "thread1", "user1", "user1");
  });

  it("desatribui quando unassign: true", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unassign: true }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockUnassign).toHaveBeenCalledWith("t1", "thread1", "user1");
  });
});
