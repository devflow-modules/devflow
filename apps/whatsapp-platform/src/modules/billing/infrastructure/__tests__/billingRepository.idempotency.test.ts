import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe("ensureWebhookIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("primeiro evento retorna true; segundo (mesmo stripeEventId) retorna false", async () => {
    mockCreate
      .mockResolvedValueOnce({ id: "1" })
      .mockRejectedValueOnce(new Error("Unique constraint failed"));

    const { ensureWebhookIdempotency } = await import("../billingRepository");

    await expect(ensureWebhookIdempotency("evt_123", "invoice.paid")).resolves.toBe(true);
    await expect(ensureWebhookIdempotency("evt_123", "invoice.paid")).resolves.toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
