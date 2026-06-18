import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function getHealth(url = "http://localhost/career-system/health") {
  return GET(new Request(url) as never);
}

describe("GET /career-system/health", () => {
  it("returns aggregated client-safe health with a correlation id and no probe by default", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
    expect(Array.isArray(body.components)).toBe(true);
    expect(body.components.every((c: { reachable: boolean | null }) => c.reachable === null)).toBe(true);
    expect(body.correlationId.startsWith("career_")).toBe(true);
    expect(res.headers.get("x-career-correlation-id")).toBe(body.correlationId);
  });

  it("never returns secrets", async () => {
    const res = await getHealth();
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toMatch(/sk-[a-z0-9]/i);
    expect(raw.toLowerCase()).not.toContain("authorization");
    expect(raw.toLowerCase()).not.toContain("api_key");
  });

  it("rejects POST with 405", async () => {
    const res = await POST();
    expect(res.status).toBe(405);
  });
});
