import { describe, it, expect, vi } from "vitest";
import { listInvites } from "@/modules/financeiro/services/invites/listInvites";

describe("listInvites", () => {
  it("deve retornar lista vazia quando não há convites pendentes", async () => {
    const prisma = {
      invite: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    const result = await listInvites(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.invite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          householdId: "household-1",
          acceptedAt: null,
        }),
      })
    );
  });

  it("deve retornar convites pendentes com campos esperados", async () => {
    const mockInvites = [
      { id: "inv-1", email: "a@b.com", role: "MEMBER", expiresAt: new Date(), createdAt: new Date() },
    ];
    const prisma = {
      invite: { findMany: vi.fn().mockResolvedValue(mockInvites) },
    } as any;

    const result = await listInvites(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id", "inv-1");
    expect(result[0]).toHaveProperty("email", "a@b.com");
    expect(result[0]).toHaveProperty("role", "MEMBER");
  });
});
