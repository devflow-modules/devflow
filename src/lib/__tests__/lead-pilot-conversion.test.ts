import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/whatsapp-crm-db", () => ({
  getWhatsappCrmPrisma: vi.fn(),
}));

import { prisma } from "@/lib/prisma-root";
import { getWhatsappCrmPrisma } from "@/lib/whatsapp-crm-db";
import {
  buildPilotConversionNote,
  convertLeadToWhatsappPilot,
  loadWhatsappPilotTenantSummary,
} from "../lead-pilot-conversion";

const mockWa = {
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

describe("lead-pilot-conversion", () => {
  beforeEach(() => {
    vi.mocked(getWhatsappCrmPrisma).mockReturnValue(mockWa as never);
    vi.mocked(prisma.lead.findUnique).mockReset();
    vi.mocked(prisma.lead.update).mockReset();
    mockWa.tenant.findUnique.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("buildPilotConversionNote não inclui access token", () => {
    const note = buildPilotConversionNote({
      leadId: "lead-1",
      convertedAt: new Date("2026-06-09T12:00:00.000Z"),
      internalOwner: "Ops DevFlow",
      tenant: {
        id: "tenant-1",
        name: "Cliente Piloto",
        gtmLifecycle: "AVALIACAO",
        whatsappPhone: "+5511999990000",
        channels: [
          {
            displayPhoneNumber: "+5511888777666",
            wabaId: "waba-123",
            phoneNumberId: "pn-456",
            status: "ACTIVE",
          },
        ],
      },
    });
    expect(note).toContain("tenant-1");
    expect(note).toContain("waba-123");
    expect(note).toContain("pn-456");
    expect(note).not.toContain("EAA");
    expect(note).not.toMatch(/accessToken/i);
  });

  it("loadWhatsappPilotTenantSummary descarta accessToken do select", async () => {
    mockWa.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      name: "Piloto",
      gtmLifecycle: "AVALIACAO",
      whatsappPhone: null,
      whatsappPhoneNumbers: [
        {
          displayPhoneNumber: "+5511999990000",
          wabaId: "waba-x",
          phoneNumberId: "pn-y",
          status: "ACTIVE",
          accessToken: "EAA-secret-token",
        },
      ],
    });

    const result = await loadWhatsappPilotTenantSummary("tenant-1");
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.tenant.channels[0]).toEqual({
      displayPhoneNumber: "+5511999990000",
      wabaId: "waba-x",
      phoneNumberId: "pn-y",
      status: "ACTIVE",
    });
    expect(JSON.stringify(result.tenant)).not.toContain("EAA-secret-token");
  });

  it("convertLeadToWhatsappPilot associa convertedToRef e notes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      convertedAt: null,
      notes: "Briefing diagnóstico",
    } as never);
    mockWa.tenant.findUnique.mockResolvedValue({
      id: "tenant-abc",
      name: "Empresa Piloto",
      gtmLifecycle: "AVALIACAO",
      whatsappPhone: null,
      whatsappPhoneNumbers: [],
    });
    vi.mocked(prisma.lead.update).mockResolvedValue({ id: "lead-1" } as never);

    await convertLeadToWhatsappPilot("lead-1", {
      tenantId: "tenant-abc",
      confirm: true,
      internalOwner: "Gustavo",
    });

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1" },
        data: expect.objectContaining({
          convertedToType: "whatsapp_platform",
          convertedToRef: "tenant-abc",
          status: "fechado",
          notes: expect.stringContaining("[Piloto WhatsApp Platform — conversão CRM]"),
        }),
      })
    );
    const updateCall = vi.mocked(prisma.lead.update).mock.calls[0]?.[0] as {
      data: { notes: string };
    };
    expect(updateCall.data.notes).toContain("Briefing diagnóstico");
    expect(updateCall.data.notes).not.toContain("EAA");
  });

  it("409 quando lead já convertido", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      convertedAt: new Date(),
    } as never);

    await expect(
      convertLeadToWhatsappPilot("lead-1", { tenantId: "tenant-abc", confirm: true })
    ).rejects.toMatchObject({ code: "ALREADY_CONVERTED", status: 409 });
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("404 quando tenant não existe em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      convertedAt: null,
      notes: null,
    } as never);
    mockWa.tenant.findUnique.mockResolvedValue(null);

    await expect(
      convertLeadToWhatsappPilot("lead-1", { tenantId: "missing", confirm: true })
    ).rejects.toMatchObject({ code: "TENANT_NOT_FOUND", status: 404 });
  });
});
