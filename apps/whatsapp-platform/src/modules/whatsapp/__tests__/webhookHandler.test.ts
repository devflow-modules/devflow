import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockResolveTenant = vi.fn();

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
  persistWaInboxFromWebhook: vi.fn().mockResolvedValue(undefined),
}));

describe("webhookHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-secret";
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

    it("não devolve challenge quando token não confere", async () => {
      const { handleWebhookVerification } = await import("../webhookHandler");
      const url = new URL("http://localhost/api/webhook/whatsapp");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "wrong");
      const req = new NextRequest(url);
      const res = await handleWebhookVerification(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.webhook).toBe("whatsapp");
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
});
