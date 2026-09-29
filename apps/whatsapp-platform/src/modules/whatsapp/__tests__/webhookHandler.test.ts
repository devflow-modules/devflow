import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import * as webhookProcessing from "@/modules/messaging/webhookProcessingService";
import * as aiAutomation from "@/modules/ai/aiAutomationService";
import { prisma } from "@/lib/prisma";
import {
  clearWebhookSignatureTestEnv,
  enableWebhookSignatureBypassForTests,
  metaWebhookTestHeaders,
  setProcessEnvNodeEnv,
} from "./webhookTestHelpers";

const { mockResolveTenant, mockAfter, mockPersist } = vi.hoisted(() => ({
  mockResolveTenant: vi.fn(),
  mockPersist: vi.fn().mockResolvedValue(undefined),
  /** Captures deferred work; does not run unless the test invokes the callback. */
  mockAfter: vi.fn((_task: () => unknown) => undefined),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      mockAfter(task);
    },
  };
});

vi.mock("@/modules/whatsapp/tenantResolutionService", () => ({
  resolveTenantByPhoneNumberId: (...args: unknown[]) => mockResolveTenant(...args),
}));

vi.mock("@/modules/analytics", () => ({
  trackWebhookReceived: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  hasSupabaseConfig: () => false,
}));

vi.mock("@/modules/inbox", () => ({
  persistWaInboxFromWebhook: (...args: unknown[]) => mockPersist(...args),
}));

vi.mock("@/modules/operations/webhookHealthService", () => ({
  recordWebhookProcessingSuccess: vi.fn().mockResolvedValue(undefined),
}));

describe("webhookHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWebhookSignatureTestEnv();
    enableWebhookSignatureBypassForTests();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-secret";
    delete process.env.WHATSAPP_WEBHOOK_SYNC_PIPELINE;
  });

  afterEach(() => {
    clearWebhookSignatureTestEnv();
    delete process.env.WHATSAPP_WEBHOOK_SYNC_PIPELINE;
  });

  describe("GET /api/webhook/whatsapp (route)", () => {
    it("devolve hub.challenge pela route Next (wiring real)", async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "route-verify";
      const { GET } = await import("@/app/api/webhook/whatsapp/route");
      const url = new URL("http://localhost/api/webhook/whatsapp");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "route-verify");
      url.searchParams.set("hub.challenge", "CHALLENGE_FROM_ROUTE");
      const res = await GET(new NextRequest(url));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("CHALLENGE_FROM_ROUTE");
    });
  });

  describe("handleWebhookVerification (GET)", () => {
    it("devolve hub.challenge quando token confere", async () => {
      const { handleWebhookVerification } = await import("../webhookHandler");
      const url = new URL("http://localhost/api/webhook/whatsapp");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "verify-secret");
      url.searchParams.set("hub.challenge", "META_CHALLENGE");
      const req = new NextRequest(url);
      const res = await handleWebhookVerification(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("META_CHALLENGE");
    });

    it("403 quando token não confere", async () => {
      const { handleWebhookVerification } = await import("../webhookHandler");
      const url = new URL("http://localhost/api/webhook/whatsapp");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "wrong");
      const req = new NextRequest(url);
      const res = await handleWebhookVerification(req);
      expect(res.status).toBe(403);
      const data = (await res.json()) as {
        success: boolean;
        error?: { code: string };
      };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe("WEBHOOK_VERIFY_FORBIDDEN");
    });

    it("403 quando GET sem parâmetros hub (probing)", async () => {
      const { handleWebhookVerification } = await import("../webhookHandler");
      const req = new NextRequest(new URL("http://localhost/api/webhook/whatsapp"));
      const res = await handleWebhookVerification(req);
      expect(res.status).toBe(403);
      const data = (await res.json()) as { success: boolean; error?: { code: string } };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe("WEBHOOK_VERIFY_FORBIDDEN");
    });
  });

  describe("handleWebhookEvents (POST)", () => {
    it("400 quando corpo não é JSON (contrato jsonError)", async () => {
      const { handleWebhookEvents } = await import("../webhookHandler");
      const req = new Request("http://localhost/api/webhook/whatsapp", {
        method: "POST",
        body: "not-json{",
        headers: { "Content-Type": "application/json" },
      });
      const res = await handleWebhookEvents(req);
      expect(res.status).toBe(400);
      const j = (await res.json()) as {
        success: boolean;
        error?: { code: string; message: string };
        trace_id?: string;
      };
      expect(j.success).toBe(false);
      expect(j.error?.code).toBe("INVALID_JSON_BODY");
      expect(res.headers.get("X-Trace-Id")).toBeTruthy();
    });

    it("200 ok quando payload não normaliza (object inválido)", async () => {
      const { handleWebhookEvents } = await import("../webhookHandler");
      const req = new Request("http://localhost/api/webhook/whatsapp", {
        method: "POST",
        body: JSON.stringify({ object: "other" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await handleWebhookEvents(req);
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(mockResolveTenant).not.toHaveBeenCalled();
    });

    it("200 ok quando tenant não existe (phone_number_id conhecido)", async () => {
      mockResolveTenant.mockResolvedValue(null);
      const { handleWebhookEvents } = await import("../webhookHandler");
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: { phone_number_id: "pnid_test" },
                  messages: [],
                  statuses: [],
                },
              },
            ],
          },
        ],
      };
      const req = new Request("http://localhost/api/webhook/whatsapp", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      const res = await handleWebhookEvents(req);
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(mockResolveTenant).toHaveBeenCalledWith("pnid_test");
    });
  });

  describe("handleWebhookEvents — assinatura Meta", () => {
    const appSecret = "handler_test_secret";
    const payload = { object: "other" };
    const rawBody = JSON.stringify(payload);

    beforeEach(() => {
      delete process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE;
      process.env.META_APP_SECRET = appSecret;
      setProcessEnvNodeEnv("test");
    });

    it("aceita POST com assinatura válida", async () => {
      const { handleWebhookEvents } = await import("../webhookHandler");
      const res = await handleWebhookEvents(
        new Request("http://localhost/api/webhook/whatsapp", {
          method: "POST",
          body: rawBody,
          headers: metaWebhookTestHeaders(rawBody, appSecret),
        })
      );
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });

    it("401 quando assinatura ausente", async () => {
      const { handleWebhookEvents } = await import("../webhookHandler");
      const res = await handleWebhookEvents(
        new Request("http://localhost/api/webhook/whatsapp", {
          method: "POST",
          body: rawBody,
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(res.status).toBe(401);
      const j = (await res.json()) as { error?: { code: string } };
      expect(j.error?.code).toBe("WEBHOOK_SIGNATURE_MISSING");
      expect(mockResolveTenant).not.toHaveBeenCalled();
    });

    it("401 quando assinatura inválida", async () => {
      const { handleWebhookEvents } = await import("../webhookHandler");
      const res = await handleWebhookEvents(
        new Request("http://localhost/api/webhook/whatsapp", {
          method: "POST",
          body: rawBody,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=deadbeef",
          },
        })
      );
      expect(res.status).toBe(401);
      const j = (await res.json()) as { error?: { code: string } };
      expect(j.error?.code).toBe("WEBHOOK_SIGNATURE_INVALID");
    });

    it("403 quando META_APP_SECRET ausente (sem bypass)", async () => {
      delete process.env.META_APP_SECRET;
      const { handleWebhookEvents } = await import("../webhookHandler");
      const res = await handleWebhookEvents(
        new Request("http://localhost/api/webhook/whatsapp", {
          method: "POST",
          body: rawBody,
          headers: metaWebhookTestHeaders(rawBody, appSecret),
        })
      );
      expect(res.status).toBe(403);
      const j = (await res.json()) as { error?: { code: string } };
      expect(j.error?.code).toBe("WEBHOOK_APP_SECRET_MISSING");
    });
  });

  describe("handleWebhookEvents — after() defers AI pipeline", () => {
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
                    id: "wam_after_defer_1",
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

    it("chama after com pipeline adiado quando WHATSAPP_WEBHOOK_SYNC_PIPELINE não está set", async () => {
      delete process.env.WHATSAPP_WEBHOOK_SYNC_PIPELINE;
      mockResolveTenant.mockResolvedValue({
        id: "tenant-1",
        phoneNumberId: "pnid_test",
        displayPhoneNumber: "+5511",
        accessToken: "token",
        channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
      });
      mockPersist.mockResolvedValue(undefined);

      const findFirstSpy = vi.spyOn(prisma.whatsappPhoneNumber, "findFirst").mockResolvedValue({
        id: "line-test-1",
      } as Awaited<ReturnType<typeof prisma.whatsappPhoneNumber.findFirst>>);
      const countSpy = vi.spyOn(prisma.aiMessageLog, "count").mockResolvedValue(0);
      const prepareSpy = vi
        .spyOn(webhookProcessing, "prepareInboundConversation")
        .mockResolvedValue({ inboxThreadId: "th-1", textBody: "Oi" });
      vi.spyOn(aiAutomation, "checkTenantAiAutomationReady").mockResolvedValue({
        ready: true,
        reason: "test",
      });
      const aiSpy = vi.spyOn(aiAutomation, "runTenantAiAutoReply").mockResolvedValue(undefined);

      try {
        const { handleWebhookEvents } = await import("../webhookHandler");
        const body = JSON.stringify(textPayload);
        const res = await handleWebhookEvents(
          new Request("http://localhost/api/webhook/whatsapp", {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
          })
        );

        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
        expect(mockPersist).toHaveBeenCalledTimes(1);
        expect(mockAfter).toHaveBeenCalledTimes(1);
        expect(typeof mockAfter.mock.calls[0]?.[0]).toBe("function");
        // Pipeline must not run until after() callback executes.
        expect(prepareSpy).not.toHaveBeenCalled();
        expect(aiSpy).not.toHaveBeenCalled();

        const deferred = mockAfter.mock.calls[0][0] as () => Promise<void>;
        await deferred();
        expect(prepareSpy).toHaveBeenCalledTimes(1);
        expect(aiSpy).toHaveBeenCalledTimes(1);
      } finally {
        findFirstSpy.mockRestore();
        countSpy.mockRestore();
        prepareSpy.mockRestore();
        vi.restoreAllMocks();
      }
    });
  });
});
