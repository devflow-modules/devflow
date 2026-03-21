import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { verifyWebhookSubscription } from "../whatsappWebhook.service";

describe("verifyWebhookSubscription", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna challenge com token válido e mode subscribe", () => {
    const r = verifyWebhookSubscription({
      mode: "subscribe",
      verifyToken: "secret",
      challenge: "1234567890",
      expectedVerifyToken: "secret",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.challenge).toBe("1234567890");
  });

  it("rejeita token inválido", () => {
    const r = verifyWebhookSubscription({
      mode: "subscribe",
      verifyToken: "wrong",
      challenge: "x",
      expectedVerifyToken: "good",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("rejeita mode diferente de subscribe", () => {
    const r = verifyWebhookSubscription({
      mode: "unsubscribe",
      verifyToken: "a",
      challenge: "c",
      expectedVerifyToken: "a",
    });
    expect(r.ok).toBe(false);
  });

  it("rejeita challenge vazio", () => {
    const r = verifyWebhookSubscription({
      mode: "subscribe",
      verifyToken: "a",
      challenge: "",
      expectedVerifyToken: "a",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});
