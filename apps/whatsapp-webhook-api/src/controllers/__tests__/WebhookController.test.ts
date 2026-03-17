import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const mockTenantService = vi.hoisted(() => ({ resolveTenant: vi.fn() }));
const mockConversationService = vi.hoisted(() => ({ processInbound: vi.fn() }));
const mockAiService = vi.hoisted(() => ({ classifyIntent: vi.fn(), generateResponse: vi.fn() }));
const mockWhatsAppService = vi.hoisted(() => ({ sendTextMessage: vi.fn() }));
const mockMessageService = vi.hoisted(() => ({ create: vi.fn() }));
const mockQueueService = vi.hoisted(() => ({
  enqueue: vi.fn(),
  findAvailableAgent: vi.fn(),
  assignConversationToAgent: vi.fn(),
}));

vi.mock("../../services/TenantService.js", () => ({ tenantService: mockTenantService }));
vi.mock("../../services/ConversationService.js", () => ({ conversationService: mockConversationService }));
vi.mock("../../services/AIService.js", () => ({ aiService: mockAiService }));
vi.mock("../../services/WhatsAppService.js", () => ({ whatsAppService: mockWhatsAppService }));
vi.mock("../../services/MessageService.js", () => ({ messageService: mockMessageService }));
vi.mock("../../services/QueueService.js", () => ({ queueService: mockQueueService }));

function createMockReqRes(body: unknown = {}) {
  const res = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as Response;
  const req = { body } as Request;
  return { req, res };
}

describe("WebhookController", () => {
  let controller: InstanceType<typeof import("../WebhookController.js").WebhookController>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.WHATSAPP_DATABASE_URL = process.env.WHATSAPP_DATABASE_URL ?? "postgresql://localhost:5432/test";
    const { WebhookController } = await import("../WebhookController.js");
    controller = new WebhookController();
    mockTenantService.resolveTenant.mockResolvedValue({
      id: "tenant-1",
      phoneNumberId: "pn-1",
      accessToken: "token",
      aiDriver: "ruleBased",
    });
    mockConversationService.processInbound.mockResolvedValue({
      conversationId: "conv-1",
      recentMessages: [],
    });
    mockAiService.classifyIntent.mockResolvedValue({ intent: "FAQ" });
    mockAiService.generateResponse.mockResolvedValue({
      response: "Olá!",
      escalate: false,
    });
    mockWhatsAppService.sendTextMessage.mockResolvedValue(undefined);
    mockMessageService.create.mockResolvedValue({});
    mockQueueService.enqueue.mockResolvedValue({});
    mockQueueService.findAvailableAgent.mockResolvedValue(null);
    mockQueueService.assignConversationToAgent.mockResolvedValue(undefined);
  });

  describe("handleWebhook - fluxo com mensagem inbound", () => {
    it("processa mensagem de texto e chama sendTextMessage e messageService.create", async () => {
      mockTenantService.resolveTenant.mockResolvedValue({
        id: "tenant-1",
        phoneNumberId: "pn-1",
        accessToken: "token",
        aiDriver: "ruleBased",
      });
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "1",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: { display_phone_number: "5511999999999", phone_number_id: "pn-1" },
                  contacts: [{ profile: { name: "User" }, wa_id: "5511888888888" }],
                  messages: [
                    {
                      from: "5511888888888",
                      id: "wamid.1",
                      timestamp: "1704067200",
                      type: "text",
                      text: { body: "Oi" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };
      const { req, res } = createMockReqRes(payload);

      await controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("OK");
      await new Promise((r) => setTimeout(r, 50));
      expect(mockTenantService.resolveTenant).toHaveBeenCalled();
      expect(mockConversationService.processInbound).toHaveBeenCalled();
      expect(mockAiService.classifyIntent).toHaveBeenCalledWith("Oi", expect.any(Object));
      expect(mockAiService.generateResponse).toHaveBeenCalled();
      expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalled();
      expect(mockMessageService.create).toHaveBeenCalled();
    });

    it("quando escalate = true chama queueService.enqueue", async () => {
      mockAiService.generateResponse.mockResolvedValue({
        response: "Vou transferir.",
        escalate: true,
      });
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "1",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: { display_phone_number: "5511999999999", phone_number_id: "pn-1" },
                  contacts: [{ profile: { name: "User" }, wa_id: "5511888888888" }],
                  messages: [
                    {
                      from: "5511888888888",
                      id: "wamid.2",
                      timestamp: "1704067200",
                      type: "text",
                      text: { body: "Falar com humano" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };
      const { req, res } = createMockReqRes(payload);

      await controller.handleWebhook(req, res);
      await new Promise((r) => setTimeout(r, 80));

      expect(mockQueueService.enqueue).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        conversationId: "conv-1",
        priority: 0,
      });
    });

    it("quando escalate = true e há agente disponível chama assignConversationToAgent", async () => {
      mockAiService.generateResponse.mockResolvedValue({
        response: "Transferindo.",
        escalate: true,
      });
      mockQueueService.findAvailableAgent.mockResolvedValue({
        id: "as-1",
        userId: "user-agent-1",
        tenantId: "tenant-1",
        status: "available",
      });
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "1",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: { display_phone_number: "5511999999999", phone_number_id: "pn-1" },
                  contacts: [{ profile: { name: "User" }, wa_id: "5511888888888" }],
                  messages: [
                    {
                      from: "5511888888888",
                      id: "wamid.3",
                      timestamp: "1704067200",
                      type: "text",
                      text: { body: "Quero humano" },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };
      const { req, res } = createMockReqRes(payload);

      await controller.handleWebhook(req, res);
      await new Promise((r) => setTimeout(r, 100));

      expect(mockQueueService.enqueue).toHaveBeenCalled();
      expect(mockQueueService.assignConversationToAgent).toHaveBeenCalledWith(
        "tenant-1",
        "conv-1",
        "user-agent-1"
      );
    });
  });
});
