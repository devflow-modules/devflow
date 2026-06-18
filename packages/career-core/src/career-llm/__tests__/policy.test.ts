import { describe, expect, it } from "vitest";
import { orchestrateCareerAgents } from "../../career-agents/orchestrator.js";
import { evaluateCareerLlmPolicy } from "../policy.js";
import type { CareerLlmRequest } from "../types.js";
import { createMockProviderConfig, createSampleCareerBundle, createSampleSignal } from "./fixtures.js";

function buildRequest(overrides: Partial<CareerLlmRequest> = {}): CareerLlmRequest {
  const signal = createSampleSignal({ id: "signal-1" });
  const agentResult = orchestrateCareerAgents(
    {
      intent: "analyze_application_fit",
      explicitConsent: true,
      context: {
        careerBundle: createSampleCareerBundle(),
        selectedSignalIds: [signal.id],
        availableSignals: [signal],
      },
    },
    "2026-06-17T10:00:00.000Z",
  );

  return {
    requestId: "career-llm-local-1",
    provider: "mock",
    task: "generate_application_fit_explanation",
    agent: "application_analyst",
    intent: "analyze_application_fit",
    explicitConsent: true,
    context: {
      careerBundle: createSampleCareerBundle(),
      agentResult,
      selectedSignalIds: [signal.id],
      selectedSignalSummaries: [`${signal.source}:${signal.kind}@${signal.occurredAt}`],
      userMessage: "Focus on backend reliability.",
    },
    ...overrides,
  };
}

describe("evaluateCareerLlmPolicy", () => {
  const providerConfig = createMockProviderConfig();

  it("allows a valid request", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest(),
      adapterEnabled: true,
      providerConfig,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when the flag is off", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest(),
      adapterEnabled: false,
      providerConfig,
    });
    expect(result).toMatchObject({ allowed: false, code: "llm_disabled" });
  });

  it("blocks when the provider is not configured", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest(),
      adapterEnabled: true,
      providerConfig: createMockProviderConfig({ configured: false }),
    });
    expect(result).toMatchObject({ allowed: false, code: "provider_not_configured" });
  });

  it("blocks an unsupported provider", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest({ provider: "anthropic" as never }),
      adapterEnabled: true,
      providerConfig: createMockProviderConfig({ provider: "anthropic" as never }),
    });
    expect(result).toMatchObject({ allowed: false, code: "unsupported_llm_provider" });
  });

  it("blocks agent-task mismatch", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest({ task: "generate_interview_preparation_content" }),
      adapterEnabled: true,
      providerConfig,
    });
    expect(result).toMatchObject({ allowed: false, code: "agent_task_mismatch" });
  });

  it("blocks an unsafe context", () => {
    const request = buildRequest();
    request.context.agentResult = { ...request.context.agentResult, hasToken: true as never };
    const result = evaluateCareerLlmPolicy({ request, adapterEnabled: true, providerConfig });
    expect(result).toMatchObject({ allowed: false, code: "unsafe_llm_context" });
  });

  it("blocks an empty user message", () => {
    const result = evaluateCareerLlmPolicy({
      request: buildRequest({
        context: { ...buildRequest().context, userMessage: "   " },
      }),
      adapterEnabled: true,
      providerConfig,
    });
    expect(result).toMatchObject({ allowed: false, code: "invalid_llm_input" });
  });
});
