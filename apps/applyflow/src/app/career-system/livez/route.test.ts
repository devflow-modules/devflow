import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("GET /career-system/livez", () => {
  it("returns alive without touching providers", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("alive");
    expect(typeof body.timestamp).toBe("string");
  });

  it("rejects POST with 405", async () => {
    const res = POST();
    expect(res.status).toBe(405);
  });
});
