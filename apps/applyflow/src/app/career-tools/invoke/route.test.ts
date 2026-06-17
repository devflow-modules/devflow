import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("POST /career-tools/invoke", () => {
  it("returns 403 for invalid body", async () => {
    const response = await POST(
      new Request("http://localhost/career-tools/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: "career.read_bundle" }),
      }) as never,
    );

    expect(response.status).toBe(403);
  });
});

describe("GET /career-tools/invoke", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
