import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWaAutoReplyClaimMetricsSnapshot,
  recordWaAutoReplyClaimCreated,
  recordWaAutoReplyClaimDuplicate,
  resetWaAutoReplyClaimMetricsForTests,
} from "../automaticReplyClaimInstrumentation";

vi.mock("@/lib/observability", () => ({
  logEvent: vi.fn(),
}));

describe("wa auto reply claim metrics", () => {
  beforeEach(() => {
    resetWaAutoReplyClaimMetricsForTests();
  });

  it("incrementa totais e dimensionais por tenant/trigger", () => {
    recordWaAutoReplyClaimCreated({
      tenantId: "t1",
      threadId: "th",
      claimId: "c1",
      triggerSource: "AI",
    });
    recordWaAutoReplyClaimDuplicate({
      tenantId: "t1",
      threadId: "th",
      triggerSource: "AI",
    });
    const snap = getWaAutoReplyClaimMetricsSnapshot();
    expect(snap.totals.claim_created).toBe(1);
    expect(snap.totals.claim_duplicate).toBe(1);
    expect(snap.dimensional["claim_created:t1:AI"]).toBe(1);
    expect(snap.dimensional["claim_duplicate:t1:AI"]).toBe(1);
  });
});
