import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("GET /career-chat/librechat/health", () => {
  it("returns client-safe transport status without secrets", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
    expect(JSON.stringify(json)).not.toContain("replace_me");
    expect(JSON.stringify(json)).not.toContain("sk-");
  });
});

describe("POST /career-chat/librechat/health", () => {
  it("returns 405", async () => {
    const response = await POST();
    expect(response.status).toBe(405);
  });
});
