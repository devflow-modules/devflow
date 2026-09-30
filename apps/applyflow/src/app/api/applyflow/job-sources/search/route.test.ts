import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("POST /api/applyflow/job-sources/search", () => {
  it("rejects invalid criteria without calling Jobgether", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockClear();
    const response = await POST(
      new Request("http://localhost/api/applyflow/job-sources/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keyword: "react",
          page: 1,
          limit: 26,
          providerUrl: "https://evil.example/jobs",
          profile: { cv: "secret" },
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_criteria" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/applyflow/job-sources/search", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_criteria" });
  });
});
