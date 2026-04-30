import { describe, it, expect, beforeEach, vi } from "vitest";

describe("PATCH /api/admin/operations (descontinuado)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retorna 410 GONE — migrar para PATCH /api/operations/tenant", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH();
    expect(res.status).toBe(410);
    const j = (await res.json()) as { success: false; error: { code: string } };
    expect(j.success).toBe(false);
    expect(j.error.code).toBe("GONE");
  });
});
