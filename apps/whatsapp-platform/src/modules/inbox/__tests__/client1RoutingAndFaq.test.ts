import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFaqFindMany = vi.fn();
const mockGetConfig = vi.fn();
const mockAssign = vi.fn();
const mockThreadFindFirst = vi.fn();
const mockUserFindMany = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockTx = {
  waInboxQueue: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  tenantOperationalConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fAQ: { findMany: (...a: unknown[]) => mockFaqFindMany(...a) },
    waInboxThread: { findFirst: (...a: unknown[]) => mockThreadFindFirst(...a) },
    user: {
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
      findFirst: vi.fn().mockResolvedValue({ role: "operator" }),
    },
    waInboxQueueMembership: {
      findMany: (...a: unknown[]) => mockMembershipFindMany(...a),
    },
    $transaction: async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
}));

vi.mock("@/modules/operations/tenantOperationalConfigService", () => ({
  getOrCreateTenantOperationalConfig: (...a: unknown[]) => mockGetConfig(...a),
}));

vi.mock("../threadAssignmentService", () => ({
  assignThread: (...a: unknown[]) => mockAssign(...a),
}));

vi.mock("@/lib/observability", () => ({
  logWhatsappPilotEvent: vi.fn(),
}));

describe("faqGroundingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isola FAQ por tenant e marca supported quando há match", async () => {
    mockFaqFindMany.mockResolvedValue([
      {
        id: "f1",
        question: "Qual o horário de atendimento?",
        answer: "Segunda a sexta, 8h às 18h.",
        keywords: "horário,horario,aberto",
      },
    ]);
    const { groundMessageWithTenantFaq } = await import("@/modules/ai/faqGroundingService");
    const r = await groundMessageWithTenantFaq({
      tenantId: "tenant-a",
      messageText: "Qual o horário de vocês?",
    });
    expect(mockFaqFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } })
    );
    expect(r.supported).toBe(true);
    expect(r.promptBlock).toContain("horário");
  });

  it("unsupported quando não há overlap", async () => {
    mockFaqFindMany.mockResolvedValue([
      {
        id: "f1",
        question: "Estacionamento",
        answer: "Temos estacionamento próprio.",
        keywords: "estacionamento,parking",
      },
    ]);
    const { groundMessageWithTenantFaq } = await import("@/modules/ai/faqGroundingService");
    const r = await groundMessageWithTenantFaq({
      tenantId: "tenant-a",
      messageText: "zzzz sem overlap xxx",
    });
    expect(r.supported).toBe(false);
  });
});

describe("automaticRoutingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue({ automaticDistributionEnabled: true });
    mockThreadFindFirst.mockResolvedValue({
      id: "th1",
      status: "OPEN",
      assignedToUserId: null,
      queueId: null,
    });
    mockUserFindMany.mockResolvedValue([{ id: "u-a" }, { id: "u-b" }]);
    mockTx.tenantOperationalConfig.findUnique.mockResolvedValue({
      routingRoundRobinCursor: 0,
    });
    mockTx.tenantOperationalConfig.upsert.mockResolvedValue({});
    mockAssign.mockResolvedValue({ ok: true, changed: true });
  });

  it("desligado → não tenta assign", async () => {
    mockGetConfig.mockResolvedValue({ automaticDistributionEnabled: false });
    const { tryAutomaticRoundRobinAssign } = await import("../automaticRoutingService");
    const r = await tryAutomaticRoundRobinAssign({ tenantId: "t1", threadId: "th1" });
    expect(r.attempted).toBe(false);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("dois operadores → round-robin chama assign no primeiro elegível", async () => {
    const { tryAutomaticRoundRobinAssign } = await import("../automaticRoutingService");
    const r = await tryAutomaticRoundRobinAssign({ tenantId: "t1", threadId: "th1" });
    expect(r.attempted).toBe(true);
    if (!r.attempted || !("assigned" in r)) return;
    expect(r.assigned).toBe(true);
    expect(mockAssign).toHaveBeenCalledWith(
      "t1",
      "th1",
      "u-a",
      "system:automatic_routing",
      "system",
      expect.objectContaining({ source: "automatic_routing", strategy: "round_robin" })
    );
  });

  it("sem elegíveis → unassigned sem falhar", async () => {
    mockUserFindMany.mockResolvedValue([]);
    const { tryAutomaticRoundRobinAssign } = await import("../automaticRoutingService");
    const r = await tryAutomaticRoundRobinAssign({ tenantId: "t1", threadId: "th1" });
    expect(r).toEqual({
      attempted: true,
      assigned: false,
      reason: "no_eligible_users",
    });
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("já assignado → não sobrescreve", async () => {
    mockThreadFindFirst.mockResolvedValue({
      id: "th1",
      status: "OPEN",
      assignedToUserId: "u-owner",
      queueId: null,
    });
    const { tryAutomaticRoundRobinAssign } = await import("../automaticRoutingService");
    const r = await tryAutomaticRoundRobinAssign({ tenantId: "t1", threadId: "th1" });
    expect(r.attempted).toBe(false);
    expect(mockAssign).not.toHaveBeenCalled();
  });
});
