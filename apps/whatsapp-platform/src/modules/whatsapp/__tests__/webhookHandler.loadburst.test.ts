/**
 * Carga simples: N POSTs com o mesmo payload (simula reenvios Meta).
 * Esperado: persistência chamada N vezes; pipeline IA (prepare + runAi) apenas na 1.ª entrega.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import * as webhookProcessing from "@/modules/messaging/webhookProcessingService";
import * as aiAutomation from "@/modules/ai/aiAutomationService";
import * as tenantOps from "@/modules/operations/tenantOperationalConfigService";
import { prisma } from "@/lib/prisma";
import { enableWebhookSignatureBypassForTests, clearWebhookSignatureTestEnv } from "./webhookTestHelpers";

const { mockResolveTenant, mockPersist } = vi.hoisted(() => ({
  mockResolveTenant: vi.fn(),
  mockPersist: vi.fn(),
}));

vi.mock("@/modules/whatsapp/tenantResolutionService", () => ({
  resolveTenantByPhoneNumberId: (...args: unknown[]) => mockResolveTenant(...args),
}));

vi.mock("@/modules/inbox", () => ({
  persistWaInboxFromWebhook: (...args: unknown[]) => mockPersist(...args),
}));

vi.mock("@/modules/analytics", () => ({
  trackWebhookReceived: vi.fn(),
}));

vi.mock("@/lib/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability")>();
  return {
    ...actual,
    bumpMetric: vi.fn(),
    logError: vi.fn(),
    logEvent: vi.fn(),
    logWhatsappPilotEvent: vi.fn(),
  };
});

const BURST = 40;

describe("handleWebhookEvents — carga simples (reenvios)", () => {
  let countSpy: ReturnType<typeof vi.spyOn>;
  let findFirstSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearWebhookSignatureTestEnv();
    enableWebhookSignatureBypassForTests();
    findFirstSpy = vi.spyOn(prisma.whatsappPhoneNumber, "findFirst").mockResolvedValue({
      id: "line-test-1",
    } as Awaited<ReturnType<typeof prisma.whatsappPhoneNumber.findFirst>>);
    mockResolveTenant.mockResolvedValue({
      id: "tenant-1",
      phoneNumberId: "pnid_test",
      displayPhoneNumber: "+5511",
      accessToken: "token",
      channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
    });
    mockPersist.mockResolvedValue(undefined);

    vi.spyOn(webhookProcessing, "prepareInboundConversation").mockResolvedValue({
      inboxThreadId: "th-1",
      textBody: "Oi",
    });
    vi.spyOn(webhookProcessing, "processLegacyInboundAutoReply").mockResolvedValue(undefined);
    vi.spyOn(aiAutomation, "checkTenantAiAutomationReady").mockResolvedValue({
      ready: true,
      reason: "test",
    });
    vi.spyOn(aiAutomation, "runTenantAiAutoReply").mockResolvedValue(undefined);
    vi.spyOn(tenantOps, "isOperationalAutomationEnabled").mockResolvedValue(true);

    let n = 0;
    countSpy = vi.spyOn(prisma.aiMessageLog, "count").mockImplementation(() => {
      n += 1;
      return Promise.resolve(n === 1 ? 0 : 1) as ReturnType<typeof prisma.aiMessageLog.count>;
    });
  });

  afterEach(() => {
    countSpy.mockRestore();
    findFirstSpy.mockRestore();
    vi.restoreAllMocks();
  });

  const textPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                phone_number_id: "pnid_test",
                display_phone_number: "+55 11",
              },
              messages: [
                {
                  id: "wam_load_burst_1",
                  from: "5511999999999",
                  timestamp: "1700000000",
                  type: "text",
                  text: { body: "Oi" },
                },
              ],
              statuses: [],
            },
          },
        ],
      },
    ],
  };

  it(`comportamento consistente com ${BURST} POSTs (sem duplicar pipeline)`, async () => {
    const { handleWebhookEvents } = await import("../webhookHandler");
    const body = JSON.stringify(textPayload);

    for (let i = 0; i < BURST; i++) {
      const res = await handleWebhookEvents(
        new Request("http://localhost/api/webhook/whatsapp", {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
    }

    expect(mockPersist).toHaveBeenCalledTimes(BURST);
    expect(webhookProcessing.prepareInboundConversation).toHaveBeenCalledTimes(1);
    expect(aiAutomation.runTenantAiAutoReply).toHaveBeenCalledTimes(1);
    expect(webhookProcessing.processLegacyInboundAutoReply).not.toHaveBeenCalled();
  });
});
