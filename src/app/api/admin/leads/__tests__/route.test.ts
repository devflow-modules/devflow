import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/whatsapp-crm-db", () => ({
  getWhatsappCrmPrisma: () => ({
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    waInboxThread: { findFirst: vi.fn().mockResolvedValue(null) },
  }),
}));

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma-root";
import { GET, POST } from "../route";

const authHeaders = { "x-admin-metrics-secret": "secret-leads-test" };

describe("/api/admin/leads", () => {
  beforeEach(() => {
    process.env.ADMIN_METRICS_SECRET = "secret-leads-test";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(prisma.lead.findMany).mockReset();
    vi.mocked(prisma.lead.create).mockReset();
    vi.mocked(prisma.lead.groupBy).mockReset();
  });

  it("GET 403 sem autorização", async () => {
    const req = new Request("http://localhost/api/admin/leads");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("GET retorna lista com filtro opcional e resumo", async () => {
    const rows = [
      {
        id: "1",
        name: "A",
        company: null,
        phone: "5511999990000",
        status: "novo",
        notes: null,
        origin: null,
        assignedOperatorId: null,
        lastContactAt: null,
        nextFollowUpAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(prisma.lead.findMany).mockResolvedValue(rows as never);
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([{ status: "novo", _count: { _all: 1 } }] as never);

    const res = await GET(
      new Request("http://localhost/api/admin/leads?status=novo", { headers: authHeaders })
    );
    expect(res.status).toBe(200);
    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: { status: "novo" },
    });
    const body = (await res.json()) as { operators?: unknown; leads: { id: string }[] };
    expect(body.leads).toHaveLength(1);
    expect(body.operators).toEqual([]);
    expect(body.leads[0].id).toBe("1");
    expect(body.leads[0].daysSinceLastContact).toBeNull();
    expect(body.summary).toBeDefined();
    expect(body.summary.byStatus).toEqual({ novo: 1 });
    expect(body.summary.countsByStatus).toEqual({ novo: 1 });
    expect(body.summary.funnelStageCounts).toBeDefined();
    expect(body.summary.funnelStageCounts.novo).toBe(1);
    expect(body.summary.total).toBe(1);
    expect(body.summary.conversionMetrics).toBeDefined();
    expect(body.summary.conversionMetrics.novos).toBe(1);
    expect(body.summary.conversionMetrics.total).toBe(1);
    expect(body.actionList).toBeDefined();
    expect(body.actionList.length).toBe(1);
    expect(body.leads[0].leadActionState).toBeDefined();
    expect(body.leads[0].suggestedAction).toBeDefined();
  });

  it("GET com stale=1 aplica filtro de contato parado", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([] as never);
    const res = await GET(
      new Request("http://localhost/api/admin/leads?stale=1", { headers: authHeaders })
    );
    expect(res.status).toBe(200);
    const call = vi.mocked(prisma.lead.findMany).mock.calls[0]?.[0] as { where: { OR?: unknown[] } };
    expect(call.where.OR).toBeDefined();
  });

  it("POST cria lead", async () => {
    const created = {
      id: "c1",
      name: "João",
      company: "Acme",
      phone: "+5511988887777",
      status: "novo",
      notes: "x",
      origin: null,
      assignedOperatorId: null,
      lastContactAt: null,
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.lead.create).mockResolvedValue(created as never);

    const res = await POST(
      new Request("http://localhost/api/admin/leads", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "+5511988887777",
          name: "João",
          company: "Acme",
          notes: "x",
        }),
      })
    );
    expect(res.status).toBe(201);
    expect(prisma.lead.create).toHaveBeenCalled();
    const body = await res.json();
    expect(body.lead.phone).toBe("+5511988887777");
  });

  it("POST 400 com origin fora do catálogo", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/leads", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "+5511988887777",
          name: "X",
          origin: "texto_livre_antigo",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST aceita origin canónico", async () => {
    const created = {
      id: "c2",
      name: "Y",
      company: null,
      phone: "+5511999990001",
      status: "novo",
      notes: null,
      origin: "demo",
      assignedOperatorId: null,
      lastContactAt: null,
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.lead.create).mockResolvedValue(created as never);
    const res = await POST(
      new Request("http://localhost/api/admin/leads", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "+5511999990001",
          name: "Y",
          origin: "demo",
        }),
      })
    );
    expect(res.status).toBe(201);
    const createCall = vi.mocked(prisma.lead.create).mock.calls[0]?.[0] as { data: { origin: string } };
    expect(createCall.data.origin).toBe("demo");
    const body = (await res.json()) as { lead: { origin: string; assignedOperator: null } };
    expect(body.lead.assignedOperator).toBeNull();
  });
});
