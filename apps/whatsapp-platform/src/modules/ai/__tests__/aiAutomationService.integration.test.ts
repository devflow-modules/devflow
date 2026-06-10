/**
 * Pipeline de automação IA — fluxo completo com dependências externas mockadas
 * (Prisma, LLM, WhatsApp), lógica real de guard, playbook e logging.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WaInboxThreadStatus, WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const activeLineRow = {
  status: WhatsappPhoneNumberStatus.ACTIVE,
  accessToken: "tok",
};

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

const generateOpenAiReply = vi.hoisted(() => vi.fn());
const isOpenAiConfigured = vi.hoisted(() => vi.fn().mockReturnValue(false));
const applyNeedsHumanHandoff = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ applied: true, alreadyInHandoff: false, assignedToUserId: null })
);
vi.mock("../openaiReplyService", () => ({
  generateReply: (...a: unknown[]) => generateOpenAiReply(...a),
  isOpenAiConfigured: () => isOpenAiConfigured(),
}));

vi.mock("@/modules/inbox/needsHumanHandoffService", () => ({
  applyNeedsHumanHandoff: (...a: unknown[]) => applyNeedsHumanHandoff(...a),
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

const mockPrisma = {
  aiAgentConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  tenantOperationalConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
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
    rules: ["Atender na loja."] as string[],
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

const defaultOperational = {
  id: "op-int",
  tenantId: "t1",
  aiEnabled: true,
  automationEnabled: true,
  updatedAt: new Date(),
  updatedByUserId: null as string | null,
};

function setupPipelineReady() {
  mockPrisma.whatsappPhoneNumber.findFirst.mockResolvedValue(activeLineRow);
  mockPrisma.tenantOperationalConfig.findUnique.mockResolvedValue(defaultOperational);
  mockPrisma.tenantOperationalConfig.create.mockResolvedValue(defaultOperational);
  mockPrisma.aiAgentConfig.findUnique.mockResolvedValue(mockAgentConfig());
  mockPrisma.tenant.findUnique.mockResolvedValue({ aiDriver: "openAI" });
  mockPrisma.waInboxThread.findUnique.mockResolvedValue({
    id: "thread-int",
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
    rules: ["Atender na loja."],
  });
}

describe("aiAutomationService — pipeline integrado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    isOpenAiConfigured.mockReturnValue(false);
    sendWebhookAutoReply.mockResolvedValue({ ok: true, messageId: "wam-out-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fluxo OK: LLM, envio, log auto_reply e tenantId/thread nos registos", async () => {
    vi.stubEnv("WHATSAPP_AI_SAFE_MODE", "0");
    setupPipelineReady();
    generateReply.mockResolvedValue({
      text: "Resposta integrada",
      promptUsed: "[sys]",
      tokensUsed: 10,
      durationMs: 88,
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
        id: "wam-in-int",
        from: "5511999999999",
        type: "text",
        text: { body: "bom dia, qual horário?" },
      } as never,
      inboxThreadId: "thread-int",
      textBody: "bom dia, qual horário?",
    });
    expect(mockPrisma.waInboxMessage.count).toHaveBeenCalled();
    expect(generateReply).toHaveBeenCalled();
    expect(sendWebhookAutoReply).toHaveBeenCalled();
    expect(mockPrisma.aiMessageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t1",
          waInboxThreadId: "thread-int",
          eventKind: "auto_reply",
          durationMs: 88,
        }),
      })
    );
  });

  it("bloqueio pelo guard sensível: handoff + log handoff_requested", async () => {
    setupPipelineReady();
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
        id: "wam-block",
        from: "5511999999999",
        type: "text",
        text: { body: "procon" },
      } as never,
      inboxThreadId: "thread-int",
      textBody: "procon",
    });
    expect(generateReply).not.toHaveBeenCalled();
    expect(sendWebhookAutoReply).not.toHaveBeenCalled();
    expect(applyNeedsHumanHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        threadId: "thread-int",
        reason: "handoff_trigger_keyword",
      })
    );
    expect(mockPrisma.aiMessageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventKind: "handoff_requested",
          decisionReason: expect.stringContaining("procon"),
          tenantId: "t1",
          waInboxThreadId: "thread-int",
        }),
      })
    );
  });

  it("erro do provider: handoff seguro, não envia WhatsApp", async () => {
    setupPipelineReady();
    generateReply.mockResolvedValue({
      text: "",
      promptUsed: "p",
      tokensUsed: null,
      durationMs: 200,
      error: "Provider indisponível",
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
        id: "wam-err",
        from: "5511999999999",
        type: "text",
        text: { body: "oi" },
      } as never,
      inboxThreadId: "thread-int",
      textBody: "oi",
    });
    expect(sendWebhookAutoReply).not.toHaveBeenCalled();
    expect(applyNeedsHumanHandoff).toHaveBeenCalled();
    expect(mockPrisma.aiMessageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventKind: "handoff_requested",
          tenantId: "t1",
        }),
      })
    );
  });
});
