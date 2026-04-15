import { describe, it, expect } from "vitest";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import {
  AUTO_HEAL_MAX_ATTEMPTS,
  canAutoHeal,
  computeAutoHealStatus,
  simulateWebhookConfigurationCheck,
} from "../autoHealService";

const baseEval = {
  status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
  autoHealAttempts: 0,
  lastAutoHealAt: null as Date | null,
  hasStoredAccessToken: true,
};

describe("autoHealService", () => {
  describe("computeAutoHealStatus / canAutoHeal", () => {
    it("DISABLED se META_REJECTED (tipo não permitido para auto-heal)", () => {
      const s = computeAutoHealStatus({
        ...baseEval,
        lastEvent: { type: "ERROR", message: "permission denied", createdAt: new Date().toISOString() },
      });
      expect(s).toBe("DISABLED");
      expect(
        canAutoHeal({
          ...baseEval,
          lastEvent: { type: "ERROR", message: "permission denied", createdAt: new Date().toISOString() },
        })
      ).toBe(false);
    });

    it("DISABLED se TOKEN_INVALID mas sem token na BD", () => {
      const old = new Date(Date.now() - 10 * 60_000).toISOString();
      const s = computeAutoHealStatus({
        ...baseEval,
        hasStoredAccessToken: false,
        lastEvent: { type: "ERROR", message: "invalid token", createdAt: old },
      });
      expect(s).toBe("DISABLED");
    });

    it("DISABLED após limite de tentativas", () => {
      const old = new Date(Date.now() - 10 * 60_000).toISOString();
      const s = computeAutoHealStatus({
        ...baseEval,
        autoHealAttempts: AUTO_HEAL_MAX_ATTEMPTS,
        lastEvent: { type: "ERROR", message: "invalid token", createdAt: old },
      });
      expect(s).toBe("DISABLED");
    });

    it("COOLDOWN se dentro da janela após erro (TOKEN 5 min)", () => {
      const recent = new Date(Date.now() - 2 * 60_000).toISOString();
      expect(
        computeAutoHealStatus({
          ...baseEval,
          lastEvent: { type: "ERROR", message: "invalid token", createdAt: recent },
        })
      ).toBe("COOLDOWN");
    });

    it("ACTIVE quando elegível (TOKEN, erro antigo, tentativas OK)", () => {
      const old = new Date(Date.now() - 10 * 60_000).toISOString();
      const input = {
        ...baseEval,
        lastEvent: { type: "ERROR", message: "invalid token", createdAt: old },
      };
      expect(computeAutoHealStatus(input)).toBe("ACTIVE");
      expect(canAutoHeal(input)).toBe(true);
    });
  });

  describe("simulateWebhookConfigurationCheck", () => {
    it("ok com URL absoluta", () => {
      const prev = process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
      try {
        process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://app.example";
        const r = simulateWebhookConfigurationCheck();
        expect(r.ok).toBe(true);
      } finally {
        process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = prev;
      }
    });
  });
});
