import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappPhoneNumber: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
  },
}));

describe("whatsappPhoneResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolvePrimaryPhoneNumber usa isPrimary + ACTIVE ou PENDING_ACTIVATION", async () => {
    mockFindFirst.mockResolvedValue({
      id: "w1",
      tenantId: "t1",
      phoneNumberId: "pn1",
      accessToken: "tok",
      isPrimary: true,
      status: WhatsappPhoneNumberStatus.ACTIVE,
    });
    const { resolvePrimaryPhoneNumber } = await import("../whatsappPhoneResolution");
    const r = await resolvePrimaryPhoneNumber("t1");
    expect(r?.phoneNumberId).toBe("pn1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t1",
          isPrimary: true,
          status: {
            in: [WhatsappPhoneNumberStatus.ACTIVE, WhatsappPhoneNumberStatus.PENDING_ACTIVATION],
          },
        }),
      })
    );
  });

  it("resolveDefaultOutboundPhone usa isDefaultOutbound + ACTIVE", async () => {
    mockFindFirst.mockResolvedValue({
      id: "w2",
      tenantId: "t1",
      phoneNumberId: "pn-def",
      accessToken: "tok",
      isDefaultOutbound: true,
      status: WhatsappPhoneNumberStatus.ACTIVE,
    });
    const { resolveDefaultOutboundPhone } = await import("../whatsappPhoneResolution");
    const r = await resolveDefaultOutboundPhone("t1");
    expect(r?.phoneNumberId).toBe("pn-def");
  });

  it("resolveMessagingTenantForOutbound usa linha da conversa quando existe", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "w3",
      tenantId: "t1",
      phoneNumberId: "pn-conv",
      displayPhoneNumber: "+1",
      accessToken: "tok",
      status: WhatsappPhoneNumberStatus.ACTIVE,
    });
    const { resolveMessagingTenantForOutbound } = await import("../whatsappPhoneResolution");
    const r = await resolveMessagingTenantForOutbound("t1", "pn-conv");
    expect(r?.phoneNumberId).toBe("pn-conv");
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it("resolveMessagingTenantForOutbound cai no default quando linha da conversa falha", async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "w4",
        tenantId: "t1",
        phoneNumberId: "pn-default",
        displayPhoneNumber: "",
        accessToken: "tok2",
        status: WhatsappPhoneNumberStatus.ACTIVE,
        isDefaultOutbound: true,
      });
    const { resolveMessagingTenantForOutbound } = await import("../whatsappPhoneResolution");
    const r = await resolveMessagingTenantForOutbound("t1", "pn-missing");
    expect(r?.phoneNumberId).toBe("pn-default");
    expect(mockFindFirst).toHaveBeenCalledTimes(2);
  });

  it("resolvePhoneNumberById faz findUnique por phone_number_id Meta", async () => {
    mockFindUnique.mockResolvedValue({
      id: "w5",
      tenantId: "t9",
      phoneNumberId: "meta-99",
      accessToken: "t",
      status: WhatsappPhoneNumberStatus.ACTIVE,
    });
    const { resolvePhoneNumberById } = await import("../whatsappPhoneResolution");
    const r = await resolvePhoneNumberById("meta-99");
    expect(r?.tenantId).toBe("t9");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { phoneNumberId: "meta-99" } });
  });
});
