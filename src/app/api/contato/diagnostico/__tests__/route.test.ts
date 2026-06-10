import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

import { prisma } from "@/lib/prisma-root";
import { checkRateLimit } from "@/lib/rate-limit";
import { POST } from "../route";

const validPayload = {
  nome: "Ana Costa",
  whatsapp: "(21) 98888-1234",
  empresa: "Loja Beta",
  segmento: "varejo",
  volume: "20 a 50 mensagens",
  problema: "Perda de leads",
  horario: "Qualquer horário",
};

describe("POST /api/contato/diagnostico", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockReturnValue({ ok: true });
    vi.mocked(prisma.lead.create).mockReset();
  });

  afterEach(() => {
    vi.mocked(prisma.lead.create).mockReset();
  });

  it("201 cria lead com payload válido", async () => {
    vi.mocked(prisma.lead.create).mockResolvedValue({
      id: "lead-diag-1",
      name: validPayload.nome,
      company: validPayload.empresa,
      phone: "21988881234",
      status: "novo",
      notes: "briefing",
      origin: "inbound_site",
      lastContactAt: null,
      nextFollowUpAt: null,
      convertedAt: null,
      convertedToType: null,
      convertedToRef: null,
      conversationRef: null,
      assignedOperatorId: null,
      lastSuggestedActionType: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      new Request("http://localhost/api/contato/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      })
    );

    expect(res.status).toBe(201);
    expect(prisma.lead.create).toHaveBeenCalled();
    const body = (await res.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(body.id).toBe("lead-diag-1");

    const createCall = vi.mocked(prisma.lead.create).mock.calls[0]?.[0] as {
      data: { status: string; origin: string; notes: string };
    };
    expect(createCall.data.status).toBe("novo");
    expect(createCall.data.origin).toBe("inbound_site");
    expect(createCall.data.notes).toContain("whatsapp_platform");
    expect(createCall.data.notes).toContain("varejo");
  });

  it("400 rejeita payload inválido", async () => {
    const res = await POST(
      new Request("http://localhost/api/contato/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, nome: "" }),
      })
    );

    expect(res.status).toBe(400);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("400 rejeita whatsapp com poucos dígitos", async () => {
    const res = await POST(
      new Request("http://localhost/api/contato/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, whatsapp: "123" }),
      })
    );

    expect(res.status).toBe(400);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it("500 retorna mensagem genérica em falha de banco", async () => {
    vi.mocked(prisma.lead.create).mockRejectedValue(new Error("db down"));

    const res = await POST(
      new Request("http://localhost/api/contato/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      })
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Não foi possível registrar");
    expect(body.error).not.toContain("db down");
  });

  it("429 quando rate limit excedido", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, retryAfter: 120 });

    const res = await POST(
      new Request("http://localhost/api/contato/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      })
    );

    expect(res.status).toBe(429);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });
});
