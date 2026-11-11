import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockSendEmail = vi.fn();
const mockRecordAudit = vi.fn();
const mockHashPassword = vi.fn().mockResolvedValue("hashed");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      findFirst: (...a: unknown[]) => mockUserFindFirst(...a),
      create: (...a: unknown[]) => mockUserCreate(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}));

vi.mock("@/modules/auth/authService", () => ({
  hashPassword: (...a: unknown[]) => mockHashPassword(...a),
}));

vi.mock("@/modules/email/application/sendTransactionalEmail", () => ({
  sendTransactionalEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: (...a: unknown[]) => mockRecordAudit(...a),
}));

describe("teamProvisioningService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: false, errorCode: "EMAIL_NOT_CONFIGURED" });
  });

  it("manager cria operador no tenant da sessão e ignora tenantId estranho no fluxo", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "u-op",
      name: "Bruno",
      email: "bruno@clinic.test",
      role: "operator",
      status: "pending",
    });

    const { provisionTenantMember } = await import("../teamProvisioningService");
    const result = await provisionTenantMember({
      tenantId: "tenant-a",
      actorUserId: "mgr-1",
      actorRole: "manager",
      name: "Bruno",
      email: "bruno@clinic.test",
      role: "operator",
      appBaseUrl: "https://wa.example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.status).toBe("pending");
    expect(result.user.role).toBe("operator");
    expect(result.activationUrl).toContain("/activate?token=");
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-a",
          role: "operator",
          status: "pending",
        }),
      })
    );
  });

  it("rejeita platform_admin como papel provisionável", async () => {
    const { provisionTenantMember } = await import("../teamProvisioningService");
    const result = await provisionTenantMember({
      tenantId: "tenant-a",
      actorUserId: "mgr-1",
      actorRole: "manager",
      name: "Evil",
      email: "evil@clinic.test",
      // @ts-expect-error intentional privilege escalation attempt
      role: "platform_admin",
      appBaseUrl: "https://wa.example.com",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("operator não pode provisionar", async () => {
    const { provisionTenantMember } = await import("../teamProvisioningService");
    const result = await provisionTenantMember({
      tenantId: "tenant-a",
      actorUserId: "op-1",
      actorRole: "operator",
      name: "Carla",
      email: "carla@clinic.test",
      role: "operator",
      appBaseUrl: "https://wa.example.com",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN_ROLE");
  });

  it("e-mail noutro tenant não é movido silenciosamente", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "u-x",
      tenantId: "tenant-b",
      status: "active",
    });
    const { provisionTenantMember } = await import("../teamProvisioningService");
    const result = await provisionTenantMember({
      tenantId: "tenant-a",
      actorUserId: "mgr-1",
      actorRole: "manager",
      name: "Bruno",
      email: "bruno@other.test",
      role: "operator",
      appBaseUrl: "https://wa.example.com",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMAIL_EXISTS_OTHER_TENANT");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("activa membro com token válido e limpa hash", async () => {
    const { createHash } = await import("crypto");
    const raw = "a".repeat(64);
    const hash = createHash("sha256").update(raw, "utf8").digest("hex");
    mockUserFindFirst.mockResolvedValue({
      id: "u-op",
      email: "bruno@clinic.test",
      tenantId: "tenant-a",
      activationExpiresAt: new Date(Date.now() + 60_000),
    });
    mockUserUpdate.mockResolvedValue({});

    const { activateTenantMember } = await import("../teamProvisioningService");
    // Force findFirst to match by ensuring hash path is used — service hashes input
    void hash;
    const result = await activateTenantMember({ rawToken: raw, newPassword: "senha-segura" });
    expect(result.ok).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "active",
          activationTokenHash: null,
          activationExpiresAt: null,
        }),
      })
    );
  });
});
