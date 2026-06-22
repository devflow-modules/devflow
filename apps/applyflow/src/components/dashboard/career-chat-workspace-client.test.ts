import { describe, expect, it, vi } from "vitest";
import {
  CareerChatRequestError,
  runCareerChatLibrechat,
} from "./career-chat-workspace-client";

const validBody = {
  action: "analyze_resume" as const,
  message: "Review my resume",
  explicitConsent: true as const,
  context: {
    careerBundle: {
      schemaVersion: "1.0" as const,
      exportedAt: "2026-06-22T12:00:00.000Z",
      sourceProduct: "applyflow" as const,
      applications: [
        {
          id: "app-1",
          company: "Acme",
          role: "Engineer",
          source: "linkedin" as const,
          requiredSkills: ["TypeScript"],
          status: "applied" as const,
        },
      ],
    },
    selectedSignalIds: [],
    availableSignals: [],
  },
};

const completedResponse = {
  status: "completed" as const,
  provider: "librechat" as const,
  conversationId: "conv-1",
  intent: "analyze_resume" as const,
  agentResult: null,
  toolProposals: [],
  warnings: [],
  reviewRequired: true as const,
  safeForClient: true as const,
  hasToken: false as const,
  persisted: false as const,
  executedExternally: false as const,
  trace: { conversationId: "conv-1", steps: [] },
};

function mockFetch(response: Response): typeof fetch {
  return vi.fn().mockResolvedValue(response);
}

describe("runCareerChatLibrechat", () => {
  it("rejects when the request fails at the network layer", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(runCareerChatLibrechat(validBody, fetchImpl)).rejects.toBeInstanceOf(
      CareerChatRequestError,
    );
  });

  it("rejects HTTP 503 without treating the error body as a completed response", async () => {
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ error: "simulated" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(runCareerChatLibrechat(validBody, fetchImpl)).rejects.toBeInstanceOf(
      CareerChatRequestError,
    );
  });

  it("returns a completed career chat response on HTTP 200", async () => {
    const fetchImpl = mockFetch(
      new Response(JSON.stringify(completedResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await runCareerChatLibrechat(validBody, fetchImpl);
    expect(result.status).toBe("completed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects payloads that are not a career chat response shape", async () => {
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ error: "simulated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(runCareerChatLibrechat(validBody, fetchImpl)).rejects.toBeInstanceOf(
      CareerChatRequestError,
    );
  });

  it("rejects career chat responses with status error", async () => {
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ...completedResponse, status: "error" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(runCareerChatLibrechat(validBody, fetchImpl)).rejects.toBeInstanceOf(
      CareerChatRequestError,
    );
  });
});
