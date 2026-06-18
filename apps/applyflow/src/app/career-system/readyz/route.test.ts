import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("GET /career-system/readyz", () => {
  it("returns readiness checks", async () => {
    const res = GET();
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(["ready", "not_ready"]).toContain(body.status);
    expect(body.checks).toBeDefined();
    expect(typeof body.checks.appInitialized).toBe("boolean");
    expect(typeof body.checks.boundariesLoaded).toBe("boolean");
  });

  it("rejects POST with 405", async () => {
    const res = POST();
    expect(res.status).toBe(405);
  });
});
