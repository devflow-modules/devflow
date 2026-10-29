import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockClaim = vi.fn();
const mockValidateWebhook = vi.fn();
const mockHandle = vi.fn();

vi.mock("@/modules/stripe/stripeWebhook", () => ({
  validateWebhook: (...a: unknown[]) => mockValidateWebhook(...a),
  parseWebhookEvent: () => null,
}));

vi.mock("@/modules/billing/infrastructure/billingRepository", () => ({
  claimStripeWebhookEvent: (...a: unknown[]) => mockClaim(...a),
  markStripeWebhookFailed: vi.fn(),
  markStripeWebhookProcessed: vi.fn(),
}));

vi.mock("@/modules/billing/billingWebhookService", () => ({
  handleStripeWebhookEvent: (...a: unknown[]) => mockHandle(...a),
  resolveTenantId: vi.fn(),
}));

vi.mock("@/modules/billing/billingObserverService", () => ({
  logStripeEvent: vi.fn(),
  logSystemError: vi.fn(),
}));

vi.mock("@/modules/stripe/webhookLogger", () => ({
  logWebhookInvalidSignature: vi.fn(),
}));

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: vi.fn(),
}));

describe("POST /api/stripe/webhook preview guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("T04 Preview returns 503 before claim / validate / handler", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_synthetic" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("unavailable");
    expect(mockValidateWebhook).not.toHaveBeenCalled();
    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it("T07 Production proceeds past environment gate to signature validation", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    mockValidateWebhook.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_synthetic" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockValidateWebhook).toHaveBeenCalledOnce();
    expect(mockClaim).not.toHaveBeenCalled();
  });
});
