import { describe, it, expect, vi } from "vitest";
import { removeMember } from "@/modules/financeiro/services/households/removeMember";

/**
 * Testes de autorização: MEMBER não pode remover outros; OWNER não pode sair sem transferir.
 */
describe("removeMember (autorização)", () => {
  it("deve retornar FORBIDDEN quando MEMBER tenta remover outro membro", async () => {
    const prisma = {
      householdMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "target-m",
          userId: "user-target",
          householdId: "h1",
          role: "MEMBER",
          user: { id: "user-target", email: "other@x.com" },
        }),
        count: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await removeMember(
      prisma,
      "h1",
      "target-m",
      { userId: "user-caller", householdId: "h1", membershipRole: "MEMBER" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("FORBIDDEN");
    expect(prisma.householdMembership.delete).not.toHaveBeenCalled();
  });

  it("deve retornar OWNER_CANNOT_LEAVE quando OWNER tenta sair (remover a si mesmo)", async () => {
    const prisma = {
      householdMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "owner-m",
          userId: "user-owner",
          householdId: "h1",
          role: "OWNER",
          user: { id: "user-owner", email: "owner@x.com" },
        }),
        count: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await removeMember(
      prisma,
      "h1",
      "owner-m",
      { userId: "user-owner", householdId: "h1", membershipRole: "OWNER" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("OWNER_CANNOT_LEAVE");
    expect(prisma.householdMembership.delete).not.toHaveBeenCalled();
  });

  it("deve retornar LAST_OWNER quando OWNER tenta remover o único outro OWNER", async () => {
    const prisma = {
      householdMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "other-owner-m",
          userId: "other-owner",
          householdId: "h1",
          role: "OWNER",
          user: { id: "other-owner", email: "o@x.com" },
        }),
        count: vi.fn().mockResolvedValue(0),
        delete: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await removeMember(
      prisma,
      "h1",
      "other-owner-m",
      { userId: "main-owner", householdId: "h1", membershipRole: "OWNER" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("LAST_OWNER");
    expect(prisma.householdMembership.delete).not.toHaveBeenCalled();
  });

  it("deve retornar NOT_FOUND quando membership não existe ou é de outra casa", async () => {
    const prisma = {
      householdMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await removeMember(
      prisma,
      "h1",
      "inexistent-m",
      { userId: "u1", householdId: "h1", membershipRole: "OWNER" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("NOT_FOUND");
  });
});
