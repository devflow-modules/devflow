import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  ensureTenantHasPrimaryAndDefaultOutbound: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappPhoneNumber: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

describe("GET /api/whatsapp/phone-numbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t1", email: "a@b.com", name: "A", role: "manager", jti: "s1" },
      token: "x",
      sessionId: "s1",
    });
  });

  it("401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/whatsapp/phone-numbers"));
    expect(res.status).toBe(401);
  });

  it("lista apenas whatsapp_phone_numbers", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "row1",
        phoneNumberId: "pn1",
        displayPhoneNumber: "+55 11",
        wabaId: "w1",
        status: "ACTIVE",
        createdAt: new Date("2025-01-01"),
      },
    ]);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/whatsapp/phone-numbers"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data).toHaveLength(1);
    expect(j.data[0].id).toBe("row1");
  });

  it("lista vazia quando não há números", async () => {
    mockFindMany.mockResolvedValue([]);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/whatsapp/phone-numbers"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data).toEqual([]);
  });
});

describe("DELETE /api/whatsapp/phone-numbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t1", email: "a@b.com", name: "A", role: "manager", jti: "s1" },
      token: "x",
      sessionId: "s1",
    });
  });

  it("403 quando operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t1", email: "a@b.com", name: "A", role: "operator", jti: "s1" },
      token: "x",
      sessionId: "s1",
    });
    const { DELETE } = await import("../route");
    const res = await DELETE(
      new NextRequest("http://localhost/api/whatsapp/phone-numbers?id=wpn1")
    );
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 quando id não existe no tenant", async () => {
    const { DELETE } = await import("../route");
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(
      new NextRequest("http://localhost/api/whatsapp/phone-numbers?id=missing")
    );
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("remove linha WhatsappPhoneNumber", async () => {
    const { DELETE } = await import("../route");
    mockFindFirst.mockResolvedValue({ id: "wpn1", tenantId: "t1" });
    mockDelete.mockResolvedValue({});
    const res = await DELETE(
      new NextRequest("http://localhost/api/whatsapp/phone-numbers?id=wpn1")
    );
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "wpn1" } });
  });
});
