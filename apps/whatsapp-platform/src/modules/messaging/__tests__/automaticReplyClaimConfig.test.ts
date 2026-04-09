import { describe, it, expect, afterEach, vi } from "vitest";

describe("getWaAutoReplyClaimTtlMs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa default 120000 quando env ausente", async () => {
    vi.stubEnv("WA_AUTO_REPLY_CLAIM_TTL_MS", "");
    const { getWaAutoReplyClaimTtlMs } = await import("../automaticReplyClaimConfig");
    expect(getWaAutoReplyClaimTtlMs()).toBe(120_000);
  });

  it("lê WA_AUTO_REPLY_CLAIM_TTL_MS", async () => {
    vi.stubEnv("WA_AUTO_REPLY_CLAIM_TTL_MS", "300000");
    const { getWaAutoReplyClaimTtlMs } = await import("../automaticReplyClaimConfig");
    expect(getWaAutoReplyClaimTtlMs()).toBe(300_000);
  });

  it("rejeita valor abaixo do mínimo e usa default", async () => {
    vi.stubEnv("WA_AUTO_REPLY_CLAIM_TTL_MS", "5000");
    const { getWaAutoReplyClaimTtlMs } = await import("../automaticReplyClaimConfig");
    expect(getWaAutoReplyClaimTtlMs()).toBe(120_000);
  });
});
