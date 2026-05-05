import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WaInboxThreadStatus, WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

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
    plan: "OPERATIONAL_BASE",
  }),
}));

vi.mock("@/modules/billing/stripeUsageBillingService", () => ({
  billAiOverageIfApplicableAsync: vi.fn(),
}));

const mockGetOrCreateOperational = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "op1",
    tenantId: "t1",
    aiEnabled: true,
    automationEnabled: true,
    updatedAt: new Date(),
    updatedByUserId: null,
  })
);

vi.mock("@/modules/operations/tenantOperationalConfigService", () => ({
  getOrCreateTenantOperationalConfig: (...a: unknown[]) => mockGetOrCreateOperational(...a),
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
  waInboxThread: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  waInboxMessage: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  aiMessageLog: { findFirst: vi.fn(), create: vi.fn() },
  whatsappPhoneNumber: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

function mockAgentConfig(over: Record<string, unknown> = {}) {
  return {
    enabled: true,
    autoReply: true,
    tone: "NEUTRAL",
    maxTokens: 256,
    temperature: 0.5,
    model: "gpt-4o-mini",
    rules: ["Atender clientes com clareza."] as string[],
    forbiddenTopics: [] as string[],
    handoffTriggers: [] as string[],
    assistantName: null,
    businessContext: null,
    goal: null,
    runtimeDriver: null,
    outOfHoursReply: null,
    ...over,
  };
}

function setupReadyTenant() {
  mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue({
    status: WhatsappPhoneNumberStatus.ACTIVE,
    accessToken: "tok",
    autoReplyEnabled: null,
    aiProfileOverride: null,
  });
  const fullConfig = mockAgentConfig();
  mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(fullConfig);
  mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxThread.findUnique.mockResolvedValue({
    id: "thread-1",
    status: WaInboxThreadStatus.OPEN,
    assignedToUserId: null,
    aiState: null,
  });
  mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxMessage.findMany.mockResolvedValue([]);
  mockPrisma.waInboxMessage.findFirst.mockResolvedValue(null);
  mockPrisma.waInboxMessage.count.mockResolvedValue(2);
  mockPrisma.waInboxThread.findFirst.mockResolvedValue({
    status: WaInboxThreadStatus.OPEN,
    assignedToUserId: null,
  });
  mockPrisma.aiMessageLog.findFirst.mockResolvedValue(null);
  mockPrisma.aiMessageLog.create.mockResolvedValue({});
  mockPrisma.waInboxThread.update.mockResolvedValue({});
  mockPrisma.aiAgentConfig.create.mockResolvedValue({
    tone: "NEUTRAL",
    maxTokens: 256,
    temperature: 0.5,
    rules: ["Atender clientes com clareza."],
  });
}

describe("checkTenantAiAutomationReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateOperational.mockResolvedValue({
      id: "op1",
      tenantId: "t1",
      aiEnabled: true,
      automationEnabled: true,
      updatedAt: new Date(),
      updatedByUserId: null,
    });
    mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue({
      status: WhatsappPhoneNumberStatus.ACTIVE,
      accessToken: "tok",
      autoReplyEnabled: null,
      aiProfileOverride: null,
    });
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

  it("rejeita quando IA pausada pelo painel operacional", async () => {
    mockGetOrCreateOperational.mockResolvedValueOnce({
      id: "op1",
      tenantId: "t1",
      aiEnabled: false,
      automationEnabled: true,
      updatedAt: new Date(),
      updatedByUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: false, reason: "operational_ai_paused" });
  });

  it("rejeita quando IA desabilitada", async () => {
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig({ enabled: false }));
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
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig({ rules: ["x"] }));
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
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(
      mockAgentConfig({
        rules: [],
        forbiddenTopics: [],
        handoffTriggers: [],
        assistantName: null,
        businessContext: null,
        goal: null,
      })
    );
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
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig({ rules: ["ok"] }));
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th-standalone",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: true, reason: "openai_standalone" });
    expect(mockPrisma.aiAgentConfig.findUnique).toHaveBeenCalled();
  });

  it("standalone: canal com auto_reply desactivado bloqueia mesmo com tenant activo", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue({
      status: WhatsappPhoneNumberStatus.ACTIVE,
      accessToken: "tok",
      autoReplyEnabled: false,
      aiProfileOverride: null,
    });
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig({ rules: ["ok"] }));
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th-standalone",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: false, reason: "auto_reply_off" });
  });

  it("standalone: perfil só no canal satisfaz prompt mínimo", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue({
      status: WhatsappPhoneNumberStatus.ACTIVE,
      accessToken: "tok",
      autoReplyEnabled: null,
      aiProfileOverride: "Instrução só da linha.",
    });
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(
      mockAgentConfig({
        rules: [],
        forbiddenTopics: [],
        handoffTriggers: [],
        assistantName: null,
        businessContext: null,
        goal: null,
      })
    );
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th-standalone",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: true, reason: "openai_standalone" });
  });

  it("rejeita standalone quando thread atribuída a humano", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig());
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
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig({ businessContext: "Loja B" }));
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

  it("rejeita canal em pending_activation", async () => {
    mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValueOnce({
      status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
      accessToken: null,
      autoReplyEnabled: null,
      aiProfileOverride: null,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999", "pn-line");
    expect(r).toEqual({ ready: false, reason: "channel_not_active" });
  });
});

describe("runTenantAiAutoReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue({
      status: WhatsappPhoneNumberStatus.ACTIVE,
      accessToken: "tok",
      autoReplyEnabled: null,
      aiProfileOverride: null,
    });
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    sendWebhookAutoReply.mockResolvedValue({ ok: true, messageId: "wam-out-1" });
    generateOpenAiReply.mockResolvedValue({
      reply: "Resposta OpenAI",
      fallback: false,
      tokensUsed: 1,
      durationMs: 10,
    });
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
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
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
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
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
          eventKind: "auto_reply",
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
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
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
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
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
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(
      mockAgentConfig({
        goal: "Atender e qualificar.",
        enabled: true,
        autoReply: true,
        maxTokens: 512,
        temperature: 0.7,
      })
    );
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "thread-1",
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
      aiState: null,
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    mockPrisma.waInboxMessage.findFirst.mockResolvedValue(null);
    mockPrisma.waInboxMessage.findMany.mockResolvedValue([]);
    mockPrisma.waInboxMessage.count.mockResolvedValue(1);
    mockPrisma.waInboxThread.update.mockResolvedValue({});
    const { runTenantAiAutoReply } = await import("../aiAutomationService");
    await runTenantAiAutoReply({
      tenant: {
        id: "t1",
        phoneNumberId: "p",
        displayPhoneNumber: "",
        accessToken: "t",
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
      },
      message: {
        id: "wam-standalone",
        from: "5511999999999",
        type: "text",
        text: { body: "Preciso de um orçamento" },
      } as never,
      inboxThreadId: "c1",
      textBody: "Preciso de um orçamento",
    });
    expect(generateOpenAiReply).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Preciso de um orçamento" })
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
          channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
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
          eventKind: "error",
          errorMessage: expect.stringContaining("Timeout"),
        }),
      })
    );
  });
});
