import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/app/api/_helpers/auth";
import { sendError } from "@/modules/financeiro/lib/api-response";

const prismaMock = vi.hoisted(() => ({
  income: { aggregate: vi.fn() },
  expense: { aggregate: vi.fn() },
  monthSnapshot: { upsert: vi.fn(), findMany: vi.fn() },
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
  return new NextRequest("http://localhost:3000/api/month-snapshots", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/month-snapshots authorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.income.aggregate.mockClear();
    prismaMock.expense.aggregate.mockClear();
    prismaMock.monthSnapshot.upsert.mockClear();
    prismaMock.income.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 40 } });
    prismaMock.monthSnapshot.upsert.mockResolvedValue({
      id: "snap-1",
      householdId: "h1",
      year: 2026,
      month: 8,
    });
  });

  it("retorna 401 quando a membership falha (auth atual)", async () => {
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue({
      ok: false,
      response: sendError("Não autenticado", 401, undefined, "AUTH_REQUIRED"),
    });

    const res = await POST(postRequest({ year: 2026, month: 8 }));
    expect(res.status).toBe(401);
    expect(prismaMock.monthSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("OWNER fecha o mês e persiste o snapshot", async () => {
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue(membership("OWNER"));

    const res = await POST(postRequest({ year: 2026, month: 8 }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.error?.code).not.toBe("OWNER_REQUIRED");
    expect(prismaMock.monthSnapshot.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.income.aggregate).toHaveBeenCalled();
  });

  it("MEMBER recebe 403 OWNER_REQUIRED sem write", async () => {
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue(membership("MEMBER"));

    const res = await POST(postRequest({ year: 2026, month: 8 }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("OWNER_REQUIRED");
    expect(prismaMock.income.aggregate).not.toHaveBeenCalled();
    expect(prismaMock.expense.aggregate).not.toHaveBeenCalled();
    expect(prismaMock.monthSnapshot.upsert).not.toHaveBeenCalled();
  });
});
