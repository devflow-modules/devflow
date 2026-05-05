import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappPhoneNumber: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

vi.mock("@/modules/whatsapp/channelEventService", () => ({
  logChannelEvent: vi.fn(),
}));

const mockEnsure = vi.fn();
vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  ensureTenantHasPrimaryAndDefaultOutbound: (...a: unknown[]) => mockEnsure(...a),
}));

describe("whatsappChannelLifecycle — createWhatsappChannelManual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria nova linha sem marcar primária nem default outbound", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new1",
      tenantId: "t1",
      phoneNumberId: "pn_new",
    });

    const { createWhatsappChannelManual } = await import("../whatsappChannelLifecycle");
    await createWhatsappChannelManual({
      tenantId: "t1",
      phone: "+5511999999999",
      wabaId: "waba",
      phoneNumberId: "pn_new",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t1",
        phoneNumberId: "pn_new",
        isPrimary: false,
        isDefaultOutbound: false,
      }),
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockEnsure).toHaveBeenCalledWith("t1");
  });

  it("actualiza canal existente (mesmo phoneNumberId e tenant) em vez de criar duplicado", async () => {
    mockFindUnique.mockResolvedValue({
      id: "row1",
      tenantId: "t1",
      phoneNumberId: "pn1",
      status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
      accessToken: null,
    });
    mockUpdate.mockResolvedValue({ id: "row1", tenantId: "t1", phoneNumberId: "pn1" });

    const { createWhatsappChannelManual } = await import("../whatsappChannelLifecycle");
    await createWhatsappChannelManual({
      tenantId: "t1",
      phone: "+5511888888888",
      wabaId: "waba2",
      phoneNumberId: "pn1",
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "row1" },
      data: expect.objectContaining({
        displayPhoneNumber: "+5511888888888",
        wabaId: "waba2",
        status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
      }),
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockEnsure).toHaveBeenCalledWith("t1");
  });

  it("rejeita phoneNumberId já associado a outro tenant", async () => {
    mockFindUnique.mockResolvedValue({
      id: "x",
      tenantId: "other",
      phoneNumberId: "pn1",
    });

    const { createWhatsappChannelManual } = await import("../whatsappChannelLifecycle");
    await expect(
      createWhatsappChannelManual({
        tenantId: "t1",
        phone: "+5511999999999",
        wabaId: "w",
        phoneNumberId: "pn1",
      })
    ).rejects.toThrow("PHONE_NUMBER_ID_IN_USE");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
