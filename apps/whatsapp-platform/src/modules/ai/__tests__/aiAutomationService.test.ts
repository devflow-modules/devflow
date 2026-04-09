import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

const sendWebhookAutoReply = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, messageId: "wam-out-1" })
);
const generateReply = vi.hoisted(() => vi.fn());

vi.mock("@/modules/messaging/sendMessageService", () => ({
  sendWebhookAutoReply: (...a: unknown[]) => sendWebhookAutoReply(...a),
}));

vi.mock("../aiService", () => ({
  generateReply: (...a: unknown[]) => generateReply(...a),
}));

const generateOpenAiReply = vi.hoisted(() => vi.fn().mockResolvedValue("Resposta OpenAI"));
const isOpenAiConfigured = vi.hoisted(() => vi.fn().mockReturnValue(false));
vi.mock("../openaiReplyService", () => ({
  generateReply: (...a: unknown[]) => generateOpenAiReply(...a),
  isOpenAiConfigured: () => isOpenAiConfigured(),
}));

vi.mock("@/modules/billing/featureGate", () => ({
  canUseFeature: () => Promise.resolve(true),
}));

vi.mock("@/modules/billing/enforcementService", () => ({
  enforceUsageOrThrow: () => Promise.resolve(),
}));

vi.mock("@/modules/billing/usageService", () => ({
  trackUsage: () => {},
}));

vi.mock("../aiUsageService", () => ({
  trackAiUsage: () => {},
}));

vi.mock("@/modules/billing/aiUsageLimitService", () => ({
  getAiUsageStatus: vi.fn().mockResolvedValue({
    used: 0,
    limit: 100,
    percentUsed: 0,
    canUse: true,
    shouldFallbackToLegacy: false,
    period: "2025-03",
    plan: "STARTER",
  }),
}));

vi.mock("@/modules/billing/stripeUsageBillingService", () => ({
  billAiOverageIfApplicableAsync: vi.fn(),
}));

const mockPrisma = {
  aiAgentConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  waInboxThread: { findUnique: vi.fn(), findFirst: vi.fn() },
  waInboxMessage: { findFirst: vi.fn(), findMany: vi.fn() },
  aiMessageLog: { findFirst: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

function setupReadyTenant(tenantId = "t1") {
  const fullConfig = {
    enabled: true,
    systemPrompt: "Você atende a loja.",
    tone: "NEUTRAL",
    maxTokens: 256,
    temperature: 0.5,
  };
  mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(fullConfig);
  mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxThread.findUnique.mockResolvedValue({
    id: "thread-1",
    status: WaInboxThreadStatus.OPEN,
    assignedToUserId: null,
  });
  mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxMessage.findMany.mockResolvedValue([]);
  mockPrisma.waInboxMessage.findFirst.mockResolvedValue(null);
  mockPrisma.waInboxThread.findFirst.mockResolvedValue({
    status: WaInboxThreadStatus.OPEN,
    assignedToUserId: null,
  });
  mockPrisma.aiMessageLog.findFirst.mockResolvedValue(null);
  mockPrisma.aiMessageLog.create.mockResolvedValue({});
  mockPrisma.aiAgentConfig.create.mockResolvedValue({
    systemPrompt: "Você atende a loja.",
    tone: "NEUTRAL",
    maxTokens: 256,
    temperature: 0.5,
  });
}

describe("checkTenantAiAutomationReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    isOpenAiConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejeita tenant env", async () => {
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("env", "5511999999999", "pn");
    expect(r).toEqual({ ready: false, reason: "tenant_env" });
  });

  it("rejeita quando IA desabilitada", async () => {
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({ enabled: false });
    mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th1",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r.reason).toBe("ai_disabled");
  });

  it("rejeita thread fechada (fallback humano)", async () => {
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({
      enabled: true,
      systemPrompt: "Olá",
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th1",
      status: WaInboxThreadStatus.CLOSED,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r.reason).toBe("thread_not_open");
  });

  it("rejeita prompt vazio", async () => {
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({
      enabled: true,
      systemPrompt: "   ",
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th1",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r.reason).toBe("empty_prompt");
  });

  it("retorna ready quando OPENAI_API_KEY existe (standalone)", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th-standalone",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: true, reason: "openai_standalone" });
    expect(mockPrisma.aiAgentConfig.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita standalone quando thread atribuída a humano", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th1",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: "user-1",
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: false, reason: "human_handoff" });
  });

  it("isolamento: usa tenantId na busca de config", async () => {
    isOpenAiConfigured.mockReturnValue(false);
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({
      enabled: true,
      systemPrompt: "Loja B",
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "claude" });
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant");
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th-b",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("tenant-b", "5511888888888", "pn-b");
    expect(r.ready).toBe(true);
    expect(mockPrisma.aiAgentConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant-b" },
    });
  });
});

describe("runTenantAiAutoReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    sendWebhookAutoReply.mockResolvedValue({ ok: true, messageId: "wam-out-1" });
    generateOpenAiReply.mockResolvedValue("Resposta OpenAI");
    isOpenAiConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não envia para tenant virtual env", async () => {
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "env",
        phoneNumberId: "x",
        displayPhoneNumber: "",
        accessToken: "t",
      },
      message: { id: "m1", from: "5511", type: "text", text: { body: "oi" } } as never,
      inboxThreadId: "c1",
      textBody: "oi",
    });
    expect(sendWebhookAutoReply).not.toHaveBeenCalled();
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("IA habilitada: gera, envia e registra log de sucesso", async () => {
    isOpenAiConfigured.mockReturnValue(false);
    setupReadyTenant();
    generateReply.mockResolvedValue({
      text: "Olá! Como posso ajudar?",
      promptUsed: "[system]\n...",
      tokensUsed: 42,
      durationMs: 120,
    });
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "t1",
        phoneNumberId: "pid",
        displayPhoneNumber: "55114000",
        accessToken: "tok",
      },
      message: {
        id: "wam-in-99",
        from: "5511999999999",
        type: "text",
        text: { body: "preciso de ajuda" },
      } as never,
      inboxThreadId: "sup-conv",
      textBody: "preciso de ajuda",
    });
    expect(generateReply).toHaveBeenCalled();
    expect(sendWebhookAutoReply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Olá! Como posso ajudar?",
        to: "5511999999999",
      })
    );
    expect(mockPrisma.aiMessageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseGenerated: "Olá! Como posso ajudar?",
          tokensUsed: 42,
          outboundWaMessageId: "wam-out-1",
          inboundWaMessageId: "wam-in-99",
        }),
      })
    );
  });

  it("aborta envio quando guard last mile bloqueia (humano assumiu)", async () => {
    isOpenAiConfigured.mockReturnValue(false);
    setupReadyTenant();
    generateReply.mockResolvedValue({
      text: "Resposta",
      promptUsed: "p",
      tokensUsed: 1,
      durationMs: 10,
    });
    sendWebhookAutoReply.mockResolvedValue({
      ok: false,
      aborted: true,
      reason: "thread_assigned_to_human",
    });
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "t1",
        phoneNumberId: "pid",
        displayPhoneNumber: "55114000",
        accessToken: "tok",
      },
      message: {
        id: "wam-guard",
        from: "5511999999999",
        type: "text",
        text: { body: "oi" },
      } as never,
      inboxThreadId: "sup-conv",
      textBody: "oi",
    });
    expect(sendWebhookAutoReply).toHaveBeenCalled();
    expect(mockPrisma.aiMessageLog.create).not.toHaveBeenCalled();
  });

  it("dedupe: não processa mesma mensagem se já logada", async () => {
    setupReadyTenant();
    mockPrisma.aiMessageLog.findFirst.mockResolvedValue({ id: "dup" });
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "t1",
        phoneNumberId: "p",
        displayPhoneNumber: "",
        accessToken: "t",
      },
      message: { id: "same-wam", from: "5511", type: "text", text: { body: "x" } } as never,
      inboxThreadId: "c",
      textBody: "x",
    });
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("standalone OpenAI: usa generateOpenAiReply quando OPENAI_API_KEY existe", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    generateOpenAiReply.mockResolvedValue({
      reply: "Resposta via OpenAI",
      fallback: false,
      tokensUsed: 42,
      durationMs: 100,
    });
    mockPrisma.aiMessageLog.findFirst.mockResolvedValue(null);
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({
      systemPrompt: "",
      maxTokens: 512,
      temperature: 0.7,
    });
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "thread-1",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    mockPrisma.waInboxMessage.findFirst.mockResolvedValue(null);
    mockPrisma.waInboxMessage.findMany.mockResolvedValue([]);
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "t1",
        phoneNumberId: "p",
        displayPhoneNumber: "",
        accessToken: "t",
      },
      message: {
        id: "wam-standalone",
        from: "5511999999999",
        type: "text",
        text: { body: "olá" },
      } as never,
      inboxThreadId: "c1",
      textBody: "olá",
    });
    expect(generateOpenAiReply).toHaveBeenCalledWith(
      expect.objectContaining({ message: "olá" })
    );
    expect(sendWebhookAutoReply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Resposta via OpenAI",
        to: "5511999999999",
      })
    );
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("fallback em erro: log com errorMessage, lança para handler fazer fallback", async () => {
    isOpenAiConfigured.mockReturnValue(false);
    setupReadyTenant();
    generateReply.mockResolvedValue({
      text: "",
      promptUsed: "prompt",
      tokensUsed: null,
      durationMs: 5000,
      error: "Timeout após 5000ms",
    });
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await expect(
      runTenantAiAutoReply({
        tenant: {
          id: "t1",
          phoneNumberId: "p",
          displayPhoneNumber: "",
          accessToken: "t",
        },
        message: { id: "wam-err", from: "5511999999999", type: "text", text: { body: "?" } } as never,
        inboxThreadId: "c",
        textBody: "?",
      })
    ).rejects.toThrow();
    expect(sendWebhookAutoReply).not.toHaveBeenCalled();
    expect(mockPrisma.aiMessageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorMessage: expect.stringContaining("Timeout"),
        }),
      })
    );
  });
});
