import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdateMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      create: (...a: unknown[]) => mockCreate(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      updateMany: (...a: unknown[]) => mockUpdateMany(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

describe("claimStripeWebhookEvent state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("primeiro evento → process", async () => {
    mockCreate.mockResolvedValueOnce({ id: "row1" });
    const { claimStripeWebhookEvent } = await import("../billingRepository");
    await expect(claimStripeWebhookEvent("evt_1", "invoice.paid")).resolves.toEqual({
      action: "process",
      rowId: "row1",
    });
  });

  it("PROCESSED → skip_duplicate", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Unique"));
    mockFindUnique.mockResolvedValueOnce({
      id: "row1",
      status: "PROCESSED",
      updatedAt: new Date(),
    });
    const { claimStripeWebhookEvent } = await import("../billingRepository");
    await expect(claimStripeWebhookEvent("evt_1", "invoice.paid")).resolves.toEqual({
      action: "skip_duplicate",
    });
  });

  it("FAILED → reclaim process", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Unique"));
    mockFindUnique.mockResolvedValueOnce({
      id: "row1",
      status: "FAILED",
      updatedAt: new Date(),
    });
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });
    const { claimStripeWebhookEvent } = await import("../billingRepository");
    await expect(claimStripeWebhookEvent("evt_1", "invoice.paid")).resolves.toEqual({
      action: "process",
      rowId: "row1",
    });
  });

  it("PROCESSING recente → skip_in_progress", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Unique"));
    mockFindUnique.mockResolvedValueOnce({
      id: "row1",
      status: "PROCESSING",
      updatedAt: new Date(),
    });
    const { claimStripeWebhookEvent } = await import("../billingRepository");
    await expect(claimStripeWebhookEvent("evt_1", "invoice.paid")).resolves.toEqual({
      action: "skip_in_progress",
    });
  });

  it("markProcessed / markFailed", async () => {
    mockUpdate.mockResolvedValue({});
    const { markStripeWebhookProcessed, markStripeWebhookFailed } = await import(
      "../billingRepository"
    );
    await markStripeWebhookProcessed("row1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PROCESSED" }),
      })
    );
    await markStripeWebhookFailed("row1", new Error("boom"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
  });
});
