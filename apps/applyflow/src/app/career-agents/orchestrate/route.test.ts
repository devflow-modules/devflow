import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

const validBody = {
  intent: "analyze_application_fit",
  explicitConsent: true,
  context: {
    careerBundle: {
      schemaVersion: "1.0",
      exportedAt: "2026-06-16T12:00:00.000Z",
      sourceProduct: "applyflow",
      applications: [
        {
          id: "app-1",
          company: "Acme",
          role: "Backend Engineer",
          source: "linkedin",
          requiredSkills: ["TypeScript"],
          status: "applied",
        },
      ],
    },
    selectedSignalIds: [],
  },
};

describe("POST /career-agents/orchestrate", () => {
  it("returns client-safe completed result", async () => {
    const response = await POST(
      new Request("http://localhost/career-agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }) as never,
    );

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.reviewRequired).toBe(true);
    expect(json.safeForClient).toBe(true);
    expect(json.hasToken).toBe(false);
  });

  it("rejects invalid request", async () => {
    const response = await POST(
      new Request("http://localhost/career-agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "analyze_application_fit" }),
      }) as never,
    );

    expect(response.status).toBe(403);
  });
});

describe("GET /career-agents/orchestrate", () => {
  it("returns 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
