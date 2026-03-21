import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

const sendWebhookAutoReply = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ messageId: "wam-out-1" })
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

const mockPrisma = {
  aiAgentConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  waInboxThread: { findUnique: vi.fn() },
  aiMessageLog: { findFirst: vi.fn(), create: vi.fn() },
  waInboxMessage: { findMany: vi.fn() },
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
  });
  mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxMessage.findMany.mockResolvedValue([]);
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
    const r = await checkTenantAiAutomationReady("env", "5511999999999");
    expect(r).toEqual({ ready: false, reason: "tenant_env" });
  });

  it("rejeita quando IA desabilitada", async () => {
    mockPrisma.aiAgentConfig.findUnique.mockResolvedValue({ enabled: false });
    mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
    mockPrisma.waInboxThread.findUnique.mockResolvedValue({
      id: "th1",
      status: WaInboxThreadStatus.OPEN,
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999");
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
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999");
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
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999");
    expect(r.reason).toBe("empty_prompt");
  });

  it("retorna ready quando OPENAI_API_KEY existe (standalone)", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("t1", "5511999999999");
    expect(r).toEqual({ ready: true, reason: "openai_standalone" });
    expect(mockPrisma.aiAgentConfig.findUnique).not.toHaveBeenCalled();
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
    });
    const { checkTenantAiAutomationReady } = await import("../aiAutomationService");
    const r = await checkTenantAiAutomationReady("tenant-b", "5511888888888");
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
    sendWebhookAutoReply.mockResolvedValue({ messageId: "wam-out-1" });
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
      conversationId: "c1",
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
      conversationId: "sup-conv",
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
      conversationId: "c",
      textBody: "x",
    });
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("standalone OpenAI: usa generateOpenAiReply quando OPENAI_API_KEY existe", async () => {
    isOpenAiConfigured.mockReturnValue(true);
    generateOpenAiReply.mockResolvedValue("Resposta via OpenAI");
    mockPrisma.aiMessageLog.findFirst.mockResolvedValue(null);
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
      conversationId: "c1",
      textBody: "olá",
    });
    expect(generateOpenAiReply).toHaveBeenCalledWith("olá");
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
        conversationId: "c",
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
