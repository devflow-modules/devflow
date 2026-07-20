import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUpdateThreadStatus = vi.fn();
vi.mock("@/modules/inbox", () => ({
  updateThreadStatus: (...args: unknown[]) => mockUpdateThreadStatus(...args),
}));

const mockAuth = vi.fn();
vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...args),
}));

describe("POST /api/inbox/conversations/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ payload: { tenantId: "t1", sub: "user1" } });
    mockUpdateThreadStatus.mockResolvedValue({ ok: true });
  });

  it("retorna 401 sem autenticação", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(401);
    expect(mockUpdateThreadStatus).not.toHaveBeenCalled();
  });

  it("retorna 400 para status inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INVALID" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(400);
    expect(mockUpdateThreadStatus).not.toHaveBeenCalled();
  });

  it("retorna 404 quando thread não existe no tenant", async () => {
    mockUpdateThreadStatus.mockResolvedValue({ ok: false, reason: "not_found" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
    expect(mockUpdateThreadStatus).toHaveBeenCalledWith("t1", "missing", "CLOSED", "user1");
  });

  it("retorna 409 em conflito concorrente", async () => {
    mockUpdateThreadStatus.mockResolvedValue({ ok: false, reason: "conflict" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/conflito/i);
  });

  it("retorna 200 em mudança real", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { status: "OPEN" } });
    expect(mockUpdateThreadStatus).toHaveBeenCalledWith("t1", "thread1", "OPEN", "user1");
  });

  it("retorna 200 em transição idempotente (contrato: sucesso sem erro)", async () => {
    mockUpdateThreadStatus.mockResolvedValue({ ok: true });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("PENDING");
  });
});
