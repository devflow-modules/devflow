import { describe, expect, it, vi } from "vitest";
import { createLibreChatTransportAdapter } from "./adapter";
import { resolveLibreChatTransportConfig } from "./config";

const validCareerBody = {
  action: "prepare_interview" as const,
  message: "Focus on frontend architecture",
  explicitConsent: true as const,
  context: {
    careerBundle: {
      schemaVersion: "1.0" as const,
      exportedAt: "2026-06-16T12:00:00.000Z",
      sourceProduct: "applyflow" as const,
      applications: [
        {
          id: "app-1",
          company: "Acme",
          role: "Backend Engineer",
          source: "linkedin" as const,
          requiredSkills: ["TypeScript"],
          status: "applied" as const,
        },
      ],
    },
    selectedSignalIds: [],
  },
};

function enabledConfig() {
  return {
    enabled: true,
    baseUrl: "https://librechat.example",
    timeoutMs: 1000,
    configured: true,
  };
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("LibreChatTransportAdapter", () => {
  it("rejects client Authorization when transport is disabled", () => {
    const adapter = createLibreChatTransportAdapter(
      { enabled: false, baseUrl: "", timeoutMs: 1000, configured: false },
      { LIBRECHAT_API_KEY: "secret" },
    );
    const headers = new Headers({ Authorization: "Bearer secret" });
    const result = adapter.resolveInboundAuth(headers);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("client_authorization_rejected");
    }
  });

  it("accepts LibreChat server Authorization when transport is enabled", () => {
    const adapter = createLibreChatTransportAdapter(enabledConfig(), {
      LIBRECHAT_API_KEY: "secret",
    });
    const headers = new Headers({ Authorization: "Bearer secret" });
    const result = adapter.resolveInboundAuth(headers);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("librechat_server");
    }
  });

  it("maps a direct career chat body", () => {
    const adapter = createLibreChatTransportAdapter(enabledConfig(), {
      LIBRECHAT_API_KEY: "secret",
    });
    const mapped = adapter.mapInboundToCareerChatBody(validCareerBody);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.format).toBe("career_chat");
    }
  });

  it("maps a LibreChat OpenAI-compatible envelope", () => {
    const adapter = createLibreChatTransportAdapter(enabledConfig(), {
      LIBRECHAT_API_KEY: "secret",
    });
    const mapped = adapter.mapInboundToCareerChatBody({
      model: "career-chat-boundary",
      messages: [{ role: "user", content: "Focus on frontend architecture" }],
      career: {
        action: "prepare_interview",
        explicitConsent: true,
        context: validCareerBody.context,
      },
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.format).toBe("librechat_openai");
      expect(mapped.body.message).toBe("Focus on frontend architecture");
    }
  });

  it("rejects unsafe transport payload keys", () => {
    const adapter = createLibreChatTransportAdapter(enabledConfig(), {
      LIBRECHAT_API_KEY: "secret",
    });
    const mapped = adapter.mapInboundToCareerChatBody({
      ...validCareerBody,
      apiKey: "secret",
    });
    expect(mapped.ok).toBe(false);
  });

  it("maps upstream 401 health checks without serializing secrets", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(401)));
    const adapter = createLibreChatTransportAdapter(
      enabledConfig(),
      { LIBRECHAT_API_KEY: "super-secret" },
      fetchImpl as unknown as typeof fetch,
    );
    const health = await adapter.checkHealth(true);
    expect(health.reachable).toBe(false);
    expect(health.upstreamStatus).toBe(401);
    expect(JSON.stringify(health)).not.toContain("super-secret");
  });

  it("maps upstream 500 health checks", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(500)));
    const adapter = createLibreChatTransportAdapter(
      enabledConfig(),
      { LIBRECHAT_API_KEY: "secret" },
      fetchImpl as unknown as typeof fetch,
    );
    const health = await adapter.checkHealth(true);
    expect(health.reachable).toBe(false);
    expect(health.upstreamStatus).toBe(500);
  });

  it("maps timeout/network failures", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("timeout")));
    const adapter = createLibreChatTransportAdapter(
      enabledConfig(),
      { LIBRECHAT_API_KEY: "secret" },
      fetchImpl as unknown as typeof fetch,
    );
    const health = await adapter.checkHealth(true);
    expect(health.reachable).toBe(false);
    expect(health.upstreamStatus).toBeNull();
  });

  it("maps a valid LibreChat transport response without secrets", () => {
    const adapter = createLibreChatTransportAdapter(enabledConfig(), {
      LIBRECHAT_API_KEY: "super-secret",
    });
    const response = adapter.mapCareerChatResponseToTransport(
      {
        status: "completed",
        provider: "librechat",
        conversationId: "conv-1",
        intent: "prepare_interview",
        agentResult: {
          status: "completed",
          agent: "interview_coach",
          intent: "prepare_interview",
          summary: "Interview plan prepared.",
          rationale: "Deterministic routing.",
          capabilities: ["derive_interview_plan"],
          executionPlan: {
            agentRequestId: "req-1",
            agent: "interview_coach",
            intent: "prepare_interview",
            capabilities: ["derive_interview_plan"],
            selectedSignalIds: [],
            reviewRequired: true,
          },
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          persisted: false,
          executedExternally: false,
          trace: { requestId: "req-1", steps: [] },
        },
        toolProposals: [],
        warnings: [],
        reviewRequired: true,
        safeForClient: true,
        hasToken: false,
        persisted: false,
        executedExternally: false,
        trace: { conversationId: "conv-1", steps: [] },
      },
      "librechat_openai",
      true,
    );

    expect(response.openAi?.choices[0]?.message.role).toBe("assistant");
    expect(JSON.stringify(response)).not.toContain("super-secret");
    expect(response.executedExternally).toBe(true);
    expect(response.persisted).toBe(false);
  });

  it("reports transport disabled in config resolver", () => {
    expect(resolveLibreChatTransportConfig({ LIBRECHAT_TRANSPORT_ENABLED: "false" }).enabled).toBe(
      false,
    );
  });

  it("reports missing config as not configured", () => {
    const config = resolveLibreChatTransportConfig({
      LIBRECHAT_TRANSPORT_ENABLED: "true",
      LIBRECHAT_BASE_URL: "",
      LIBRECHAT_API_KEY: "",
    });
    expect(config.enabled).toBe(true);
    expect(config.configured).toBe(false);
  });
});
