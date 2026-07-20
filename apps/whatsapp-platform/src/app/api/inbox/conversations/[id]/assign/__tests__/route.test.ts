import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    mockAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "user1", role: "operator" },
    });
    mockAssign.mockResolvedValue({ ok: true, changed: true });
    mockUnassign.mockResolvedValue({ ok: true, changed: true });
  });

  it("retorna 401 sem auth", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(401);
  });

  it("retorna 400 body inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unassign: "yes" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(400);
  });

  it("claim (body vazio) chama assignThread com role", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockAssign).toHaveBeenCalledWith("t1", "thread1", "user1", "user1", "operator");
  });

  it("transfer chama assignThread com userId destino", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user2" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockAssign).toHaveBeenCalledWith("t1", "thread1", "user2", "user1", "operator");
  });

  it("unassign chama unassignThread", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unassign: true }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockUnassign).toHaveBeenCalledWith("t1", "thread1", "user1", "operator");
  });

  it("retorna 403 forbidden", async () => {
    mockUnassign.mockResolvedValue({ ok: false, reason: "forbidden" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unassign: true }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 404 thread", async () => {
    mockAssign.mockResolvedValue({ ok: false, reason: "not_found" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("retorna 404 target", async () => {
    mockAssign.mockResolvedValue({ ok: false, reason: "target_not_found" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "ghost" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(404);
  });

  it("retorna 409 conflict", async () => {
    mockAssign.mockResolvedValue({ ok: false, reason: "conflict" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(409);
  });

  it("retorna 200 idempotente", async () => {
    mockAssign.mockResolvedValue({ ok: true, changed: false });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.changed).toBe(false);
  });
});
