import { describe, it, expect, vi } from "vitest";
import { transferOwnership } from "@/modules/financeiro/services/households/transferOwnership";

/**
 * Testes de autorização: apenas OWNER pode transferir titularidade.
 * Sistema usa roles OWNER e MEMBER (sem ADMIN no schema).
 */
describe("transferOwnership (autorização)", () => {
  it("deve retornar NOT_OWNER quando quem chama é MEMBER", async () => {
    const prisma = {
      householdMembership: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: "caller-membership",
            userId: "user-caller",
            householdId: "h1",
            role: "MEMBER",
            user: { id: "user-caller", email: "member@x.com" },
          })
          .mockResolvedValueOnce({
            id: "target-membership",
            userId: "user-target",
            householdId: "h1",
            role: "MEMBER",
            user: { id: "user-target", email: "other@x.com" },
          }),
      },
      $transaction: vi.fn(),
    } as any;

    const result = await transferOwnership(
      prisma,
      "h1",
      "target-membership",
      { userId: "user-caller", householdId: "h1" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("NOT_OWNER");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve retornar TARGET_MUST_BE_MEMBER quando alvo já é OWNER", async () => {
    const prisma = {
      householdMembership: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: "caller-membership",
            userId: "owner-1",
            householdId: "h1",
            role: "OWNER",
            user: { id: "owner-1", email: "owner@x.com" },
          })
          .mockResolvedValueOnce({
            id: "target-membership",
            userId: "owner-2",
            householdId: "h1",
            role: "OWNER",
            user: { id: "owner-2", email: "owner2@x.com" },
          }),
      },
      $transaction: vi.fn(),
    } as any;

    const result = await transferOwnership(
      prisma,
      "h1",
      "target-membership",
      { userId: "owner-1", householdId: "h1" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("TARGET_MUST_BE_MEMBER");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve retornar SAME_USER quando novo titular é o próprio caller", async () => {
    const prisma = {
      householdMembership: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: "same-membership",
            userId: "user-1",
            householdId: "h1",
            role: "OWNER",
            user: { id: "user-1", email: "a@x.com" },
          })
          .mockResolvedValueOnce({
            id: "same-membership",
            userId: "user-1",
            householdId: "h1",
            role: "MEMBER",
            user: { id: "user-1", email: "a@x.com" },
          }),
      },
      $transaction: vi.fn(),
    } as any;

    const result = await transferOwnership(
      prisma,
      "h1",
      "same-membership",
      { userId: "user-1", householdId: "h1" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("SAME_USER");
  });

  it("deve retornar NOT_FOUND quando membro alvo não existe na casa", async () => {
    const prisma = {
      householdMembership: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: "caller-m",
            userId: "owner-1",
            householdId: "h1",
            role: "OWNER",
            user: {},
          })
          .mockResolvedValueOnce(null),
      },
      $transaction: vi.fn(),
    } as any;

    const result = await transferOwnership(
      prisma,
      "h1",
      "inexistent-membership",
      { userId: "owner-1", householdId: "h1" }
    );

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("NOT_FOUND");
  });
});
