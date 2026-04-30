import { describe, it, expect, vi } from "vitest";

describe("GET /api/admin/queue/next (compat)", () => {
  it("retorna 410 com instrução para /api/inbox/queue/next", async () => {
    vi.resetModules();
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(410);
    const j = (await res.json()) as { success: boolean };
    expect(j.success).toBe(false);
  });
});
