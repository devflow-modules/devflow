import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma-root";
import { createDiagnosticoLead } from "../create-diagnostico-lead";
import { DIAGNOSTICO_LEAD_ORIGIN, DIAGNOSTICO_LEAD_STATUS } from "../diagnostico-lead";

describe("createDiagnosticoLead", () => {
  beforeEach(() => {
    vi.mocked(prisma.lead.create).mockReset();
  });

  it("cria lead com status novo e origem inbound_site", async () => {
    const createdAt = new Date();
    vi.mocked(prisma.lead.create).mockResolvedValue({
      id: "lead-1",
      name: "João",
      company: "Empresa X",
      phone: "5511999990000",
      status: DIAGNOSTICO_LEAD_STATUS,
      notes: "notes",
      origin: DIAGNOSTICO_LEAD_ORIGIN,
      lastContactAt: null,
      nextFollowUpAt: null,
      convertedAt: null,
      convertedToType: null,
      convertedToRef: null,
      conversationRef: null,
      assignedOperatorId: null,
      lastSuggestedActionType: null,
      createdAt,
      updatedAt: createdAt,
    });

    await createDiagnosticoLead({
      nome: "João",
      whatsapp: "+55 (11) 99999-0000",
      empresa: "Empresa X",
      segmento: "clínica",
      volume: "Até 20 mensagens",
      problema: "Fila desorganizada",
      horario: "Tarde (12h–18h)",
    });

    expect(prisma.lead.create).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.lead.create).mock.calls[0]?.[0] as {
      data: {
        name: string;
        phone: string;
        status: string;
        origin: string;
        notes: string;
        company: string;
      };
    };
    expect(call.data.status).toBe("novo");
    expect(call.data.origin).toBe("inbound_site");
    expect(call.data.phone).toBe("5511999990000");
    expect(call.data.name).toBe("João");
    expect(call.data.company).toBe("Empresa X");
    expect(call.data.notes).toContain("whatsapp_platform");
    expect(call.data.notes).toContain("clínica");
    expect(call.data.notes).toContain("Fila desorganizada");
  });
});
