import { describe, it, expect } from "vitest";
import { classifyWebhookHealth } from "../webhookHealthService";
import { WEBHOOK_OK_MAX_AGE_MS, WEBHOOK_STALE_ERROR_MS } from "../webhookHealthConstants";

describe("classifyWebhookHealth", () => {
  const now = new Date("2026-04-11T12:00:00.000Z").getTime();

  it("error sem lastSuccessAt", () => {
    const d = classifyWebhookHealth(now, null);
    expect(d.status).toBe("error");
  });

  it("ok com sucesso recente", () => {
    const d = classifyWebhookHealth(now, {
      lastReceivedAt: new Date(now - WEBHOOK_OK_MAX_AGE_MS / 2),
      lastSuccessAt: new Date(now - WEBHOOK_OK_MAX_AGE_MS / 2),
      lastErrorAt: null,
      totalReceived: 1,
      totalErrors: 0,
      updatedAt: new Date(now),
    });
    expect(d.status).toBe("ok");
  });

  it("atenção com sucesso dentro da janela intermédia", () => {
    const d = classifyWebhookHealth(now, {
      lastReceivedAt: new Date(now - WEBHOOK_OK_MAX_AGE_MS * 2),
      lastSuccessAt: new Date(now - WEBHOOK_OK_MAX_AGE_MS * 2),
      lastErrorAt: null,
      totalReceived: 2,
      totalErrors: 0,
      updatedAt: new Date(now),
    });
    expect(d.status).toBe("attention");
  });

  it("erro com sucesso muito antigo", () => {
    const d = classifyWebhookHealth(now, {
      lastReceivedAt: new Date(now - WEBHOOK_STALE_ERROR_MS - 1000),
      lastSuccessAt: new Date(now - WEBHOOK_STALE_ERROR_MS - 1000),
      lastErrorAt: null,
      totalReceived: 3,
      totalErrors: 0,
      updatedAt: new Date(now),
    });
    expect(d.status).toBe("error");
  });
});
