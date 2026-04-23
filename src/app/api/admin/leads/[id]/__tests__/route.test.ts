import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/crm-whatsapp-auth", () => ({
  getCrmWhatsappSessionFromCookies: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/lead-operator-service", () => ({
  assertWhatsappUserIsAssignable: vi.fn().mockImplementation(async (userId: string) => ({
    id: userId,
    name: "Op",
    email: "o@t.com",
  })),
  getWhatsappUserForDisplay: vi
    .fn()
    .mockImplementation(async (userId: string) => ({ id: userId, name: "N", email: "e@x.com" })),
  syncLeadAssigneeFromThreadIfEmpty: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma-root";
import { getCrmWhatsappSessionFromCookies } from "@/lib/crm-whatsapp-auth";
import { PATCH } from "../route";

const authHeaders = { "x-admin-metrics-secret": "secret-patch-test" };

describe("PATCH /api/admin/leads/[id]", () => {
  beforeEach(() => {
    process.env.ADMIN_METRICS_SECRET = "secret-patch-test";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(prisma.lead.findUnique).mockReset();
    vi.mocked(prisma.lead.update).mockReset();
    vi.mocked(getCrmWhatsappSessionFromCookies).mockResolvedValue(null);
  });

  it("403 sem autorização", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ganho" }),
      }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(res.status).toBe(403);
  });

  it("atualiza status e define lastContactAt quando o status muda", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      status: "novo",
      phone: "55",
      name: null,
      company: null,
      notes: null,
      origin: null,
      lastContactAt: null,
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.lead.update).mockImplementation(async ({ data }: { data: { status?: string; lastContactAt?: Date | null } }) => ({
      id: "lead-1",
      status: (data as { status?: string }).status ?? "ganho",
      phone: "55",
      name: null,
      company: null,
      notes: null,
      origin: null,
      lastContactAt: (data as { lastContactAt?: Date }).lastContactAt ?? null,
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never));

    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ganho" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.lead.findUnique).toHaveBeenCalledWith({ where: { id: "lead-1" } });
    const updateArg = vi.mocked(prisma.lead.update).mock.calls[0]?.[0] as {
      data: { status: string; lastContactAt: Date };
    };
    expect(updateArg.data.status).toBe("ganho");
    expect(updateArg.data.lastContactAt).toBeInstanceOf(Date);
  });

  it("atualiza conversationRef", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      status: "novo",
      phone: "55",
      name: null,
      company: null,
      notes: null,
      origin: null,
      lastContactAt: null,
      nextFollowUpAt: null,
      conversationRef: null,
      assignedOperatorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      conversationRef: "conv-uuid",
      assignedOperatorId: null,
    } as never);

    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationRef: "conv-uuid" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );
    expect(res.status).toBe(200);
    const updateArg = vi.mocked(prisma.lead.update).mock.calls[0]?.[0] as { data: { conversationRef: string } };
    expect(updateArg.data.conversationRef).toBe("conv-uuid");
  });

  it("rejeita atribuição a operador com sessão ausente", async () => {
    vi.mocked(getCrmWhatsappSessionFromCookies).mockResolvedValue(null);
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      status: "novo",
      phone: "55",
    } as never);
    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ assignedOperatorId: "op-1" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("atualiza lastSuggestedActionType", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1", status: "novo" } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      lastSuggestedActionType: "first_contact",
    } as never);
    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ lastSuggestedActionType: "first_contact" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );
    expect(res.status).toBe(200);
    const u = vi.mocked(prisma.lead.update).mock.calls[0]?.[0] as { data: { lastSuggestedActionType: string } };
    expect(u.data.lastSuggestedActionType).toBe("first_contact");
  });

  it("atribui com sessão e devolve operador", async () => {
    vi.mocked(getCrmWhatsappSessionFromCookies).mockResolvedValue({
      sub: "op-1",
      tenantId: "t-1",
    } as never);
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({
      id: "lead-1",
      status: "novo",
      phone: "55",
    } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      status: "novo",
      phone: "55",
      assignedOperatorId: "op-1",
    } as never);
    const res = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ assignedOperatorId: "op-1" }),
      }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { lead: { assignedOperator: { id: string } } };
    expect(j.lead.assignedOperator.id).toBe("op-1");
  });
});
