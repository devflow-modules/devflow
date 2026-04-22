import { describe, expect, it } from "vitest";
import { MetaBusinessVerificationStatus } from "@/generated/prisma-whatsapp";
import {
  computeReadinessScore,
  computeVerificationStatus,
  normalizeVerificationChecklist,
} from "@/modules/whatsapp/verificationService";

describe("verificationService", () => {
  it("normalizeVerificationChecklist merges defaults", () => {
    const n = normalizeVerificationChecklist({
      items: [{ id: "business_profile", label: "x", done: true }],
    });
    expect(n.items.find((i) => i.id === "business_profile")?.done).toBe(true);
    expect(n.items.length).toBeGreaterThanOrEqual(5);
  });

  it("computeReadinessScore is 0–100", () => {
    const c = normalizeVerificationChecklist({});
    expect(computeReadinessScore(c)).toBe(0);
    const all = {
      items: c.items.map((i) => ({ ...i, done: true })),
    };
    expect(computeReadinessScore(all)).toBe(100);
  });

  it("computeVerificationStatus sugere READY quando 100% e NOT_STARTED", () => {
    const items = normalizeVerificationChecklist({}).items.map((i) => ({ ...i, done: true }));
    const r = computeVerificationStatus({ items }, MetaBusinessVerificationStatus.NOT_STARTED);
    expect(r.readinessScore).toBe(100);
    expect(r.suggestedStatus).toBe(MetaBusinessVerificationStatus.READY_FOR_SUBMISSION);
  });
});
