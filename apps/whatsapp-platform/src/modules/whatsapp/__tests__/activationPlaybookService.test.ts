import { describe, it, expect } from "vitest";
import {
  classifyChannelError,
  getChannelPlaybook,
  resolveWebhookCallbackUrl,
  toActivationPlaybookDto,
} from "../activationPlaybookService";

describe("activationPlaybookService", () => {
  describe("classifyChannelError", () => {
    it("token → TOKEN_INVALID", () => {
      expect(classifyChannelError({ message: "Invalid OAuth token" })).toBe("TOKEN_INVALID");
    });
    it("webhook → WEBHOOK_INVALID", () => {
      expect(classifyChannelError({ message: "Webhook URL mismatch" })).toBe("WEBHOOK_INVALID");
    });
    it("permission / rejected → META_REJECTED", () => {
      expect(classifyChannelError({ message: "permission denied" })).toBe("META_REJECTED");
      expect(classifyChannelError({ message: "Request rejected by Meta" })).toBe("META_REJECTED");
    });
    it("fallback → UNKNOWN", () => {
      expect(classifyChannelError({ message: "Something went wrong" })).toBe("UNKNOWN");
    });
  });

  describe("getChannelPlaybook", () => {
    it("null se último evento não é ERROR", () => {
      expect(
        getChannelPlaybook({
          status: "PENDING_ACTIVATION",
          lastEvent: { type: "CHANNEL_CREATED", message: "x" },
        })
      ).toBeNull();
    });
    it("playbook para TOKEN_INVALID", () => {
      const pb = getChannelPlaybook({
        status: "PENDING_ACTIVATION",
        lastEvent: { type: "ERROR", message: "invalid token" },
      });
      expect(pb?.errorType).toBe("TOKEN_INVALID");
      expect(pb?.steps.length).toBeGreaterThan(0);
    });
    it("null para UNKNOWN", () => {
      expect(
        getChannelPlaybook({
          status: "PENDING_ACTIVATION",
          lastEvent: { type: "ERROR", message: "weird" },
        })
      ).toBeNull();
    });
  });

  describe("toActivationPlaybookDto", () => {
    it("COPY_WEBHOOK inclui copyPayload", () => {
      const pb = getChannelPlaybook({
        status: "PENDING_ACTIVATION",
        lastEvent: { type: "ERROR", message: "webhook bad" },
      });
      expect(pb).not.toBeNull();
      const dto = toActivationPlaybookDto(pb!, { webhookCallbackUrl: "https://x.test/w" });
      expect(dto.cta?.action).toBe("COPY_WEBHOOK");
      expect(dto.cta?.copyPayload).toBe("https://x.test/w");
    });
  });

  it("resolveWebhookCallbackUrl usa base pública", () => {
    const prev = process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    try {
      process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://app.example";
      expect(resolveWebhookCallbackUrl()).toBe("https://app.example/api/webhook/whatsapp");
    } finally {
      process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = prev;
    }
  });
});
