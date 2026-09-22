import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/app/api/_helpers/auth";

const prismaMock = vi.hoisted(() => ({
  expense: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
  income: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
}));

vi.mock("@/modules/financeiro/adapters/prisma/prismaFinanceiro", () => ({
  prisma: prismaMock,
}));

import { POST } from "../route";

function membership(role: "OWNER" | "MEMBER") {
  return {
    ok: true as const,
    context: {
      userId: "u1",
      householdId: "h1",
      membershipId: "m1",
      membershipRole: role,
      supabaseId: "sb1",
      email: "owner@example.com",
    },
  };
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/recurrence", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/recurrence authorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.expense.findMany.mockClear();
    prismaMock.income.findMany.mockClear();
    prismaMock.expense.create.mockClear();
    prismaMock.income.create.mockClear();
    prismaMock.expense.findMany.mockResolvedValue([]);
    prismaMock.income.findMany.mockResolvedValue([]);
  });

  it("OWNER gera recorrências (domínio executado)", async () => {
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue(membership("OWNER"));

    const res = await POST(postRequest({ year: 2026, month: 8 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error?.code).not.toBe("OWNER_REQUIRED");
    expect(prismaMock.expense.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.income.findMany).toHaveBeenCalledTimes(1);
  });

  it("MEMBER recebe 403 OWNER_REQUIRED sem geração nem write", async () => {
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue(membership("MEMBER"));

    const res = await POST(postRequest({ year: 2026, month: 8 }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("OWNER_REQUIRED");
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.income.findMany).not.toHaveBeenCalled();
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
    expect(prismaMock.income.create).not.toHaveBeenCalled();
  });
});
