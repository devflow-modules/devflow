import { describe, it, expect, vi } from "vitest";
import { listMembers } from "@/modules/financeiro/services/households/listMembers";

describe("listMembers", () => {
  it("deve retornar lista vazia quando não há membros", async () => {
    const prisma = {
      householdMembership: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    const result = await listMembers(prisma, "household-1", "current-user-id");

    expect(result.members).toEqual([]);
    expect(prisma.householdMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId: "household-1" },
        include: { user: true },
      })
    );
  });

  it("deve marcar isMe para o usuário atual", async () => {
    const memberships = [
      {
        id: "m1",
        userId: "u1",
        user: { email: "a@b.com", name: "A" },
        role: "OWNER",
        createdAt: new Date(),
      },
      {
        id: "m2",
        userId: "u2",
        user: { email: "c@d.com", name: "C" },
        role: "MEMBER",
        createdAt: new Date(),
      },
    ];
    const prisma = {
      householdMembership: { findMany: vi.fn().mockResolvedValue(memberships) },
    } as any;

    const result = await listMembers(prisma, "household-1", "u2");

    expect(result.members).toHaveLength(2);
    expect(result.members[0].isMe).toBe(false);
    expect(result.members[1].isMe).toBe(true);
    expect(result.members[1].email).toBe("c@d.com");
  });
});
