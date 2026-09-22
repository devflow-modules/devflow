import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockSetPrimary = vi.fn();
const mockSetDefaultOutbound = vi.fn();

vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  setWhatsappLineAsPrimary: (...a: unknown[]) => mockSetPrimary(...a),
  setWhatsappLineAsDefaultOutbound: (...a: unknown[]) => mockSetDefaultOutbound(...a),
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
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/whatsapp/phone-numbers/wpn1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: "wpn1" }) };

describe("PATCH /api/whatsapp/phone-numbers/:id", () => {
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
    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest({ label: "Linha A" }), context);
    expect(res.status).toBe(401);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("403 quando operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t1", email: "a@b.com", name: "A", role: "operator", jti: "s1" },
      token: "x",
      sessionId: "s1",
    });
    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest({ setPrimary: true }), context);
    expect(res.status).toBe(403);
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockSetPrimary).not.toHaveBeenCalled();
  });

  it("atualiza etiqueta quando manager", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    mockFindFirst.mockResolvedValue({ id: "wpn1", tenantId: "t1" });
    mockUpdate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({
      id: "wpn1",
      phoneNumberId: "pn1",
      displayPhoneNumber: "+55 11",
      wabaId: "w1",
      status: "ACTIVE",
      isPrimary: false,
      isDefaultOutbound: false,
      label: "Linha A",
      createdAt: now,
      updatedAt: now,
    });
    const { PATCH } = await import("../route");
    const res = await PATCH(patchRequest({ label: "Linha A" }), context);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
