import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/app/api/_helpers/auth";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

const SOURCE_A = "clh1sourceaaaa00000000001";
const SOURCE_B = "clh2sourcebbbb00000000002";

const prismaMock = vi.hoisted(() => {
  const sources = [
    { id: "clh1sourceaaaa00000000001", householdId: "h1" },
    { id: "clh2sourcebbbb00000000002", householdId: "house-b" },
  ];
  return {
    source: {
      findMany: vi.fn(async (args?: { where?: { householdId?: string; id?: { in?: string[] } } }) => {
        const householdId = args?.where?.householdId;
        const ids = args?.where?.id?.in ?? [];
        return sources
          .filter((row) => (!householdId || row.householdId === householdId) && ids.includes(row.id))
          .map((row) => ({ id: row.id }));
      }),
    },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    cycle: { findMany: vi.fn().mockResolvedValue([]) },
    accountParticipant: { findFirst: vi.fn() },
    expense: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
});

vi.mock("@/modules/financeiro/adapters/prisma/prismaFinanceiro", () => ({
  prisma: prismaMock,
}));

import { POST } from "../route";

function membership() {
  return {
    ok: true as const,
    context: {
      userId: "u1",
      householdId: "h1",
      membershipId: "m1",
      membershipRole: "OWNER" as const,
      supabaseId: "sb1",
      email: "owner@example.com",
    },
  };
}

function postExpense(body: unknown) {
  return new NextRequest("http://localhost:3000/api/expenses", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/expenses household refs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.expense.create.mockClear();
    vi.spyOn(auth, "requireHouseholdMembership").mockResolvedValue(membership());
  });

  it("retorna 404 HOUSEHOLD_REF_NOT_FOUND para sourceId de outra casa", async () => {
    const res = await POST(
      postExpense({
        category: "Alimentação",
        amount: 150,
        dueDate: "2026-03-15",
        sourceId: SOURCE_B,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe(HOUSEHOLD_REF_NOT_FOUND);
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it("persiste quando as FKs pertencem à casa da sessão", async () => {
    prismaMock.expense.create.mockResolvedValue({
      id: "exp-1",
      householdId: "h1",
      accountId: null,
      category: "Alimentação",
      amount: 150,
      status: "PENDING",
    });

    const res = await POST(
      postExpense({
        category: "Alimentação",
        amount: 150,
        dueDate: "2026-03-15",
        sourceId: SOURCE_A,
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMock.expense.create).toHaveBeenCalledTimes(1);
  });
});
