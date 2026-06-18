import { CAREER_CHAT_MAX_MESSAGE_LENGTH } from "../career-chat/constants.js";
import { CAREER_LLM_PROVIDERS, CAREER_LLM_TASKS } from "./constants.js";
import { scanCareerLlmPayloadForForbiddenKeys } from "./security.js";
import { resolveCareerLlmTask } from "./task-mapping.js";
import type { CareerLlmPolicyDecision, CareerLlmProviderConfig, CareerLlmRequest } from "./types.js";

/**
 * Server-authoritative LLM policy. Reuses the agent result signals (safeForClient,
 * hasToken, rawProviderDataUsed, persisted) rather than duplicating the agent policy engine.
 */
export function evaluateCareerLlmPolicy(input: {
  request: CareerLlmRequest;
  adapterEnabled: boolean;
  providerConfig: CareerLlmProviderConfig;
}): CareerLlmPolicyDecision {
  const { request, adapterEnabled, providerConfig } = input;

  if (!adapterEnabled) {
    return { allowed: false, code: "llm_disabled", message: "Controlled LLM boundary is disabled." };
  }

  if (request.explicitConsent !== true) {
    return {
      allowed: false,
      code: "explicit_consent_required",
      message: "Explicit consent is required before LLM generation.",
    };
  }

  if (!(CAREER_LLM_PROVIDERS as readonly string[]).includes(request.provider)) {
    return {
      allowed: false,
      code: "unsupported_llm_provider",
      message: `Provider ${request.provider} is not supported.`,
    };
  }

  if (!providerConfig.configured) {
    return {
      allowed: false,
      code: "provider_not_configured",
      message: `Provider ${request.provider} is not configured.`,
    };
  }

  if (!(CAREER_LLM_TASKS as readonly string[]).includes(request.task)) {
    return {
      allowed: false,
      code: "unsupported_llm_task",
      message: `Task ${request.task} is not supported.`,
    };
  }

  const taskResolution = resolveCareerLlmTask(request.agent, request.intent);
  if (!taskResolution.ok || taskResolution.task !== request.task) {
    return {
      allowed: false,
      code: "agent_task_mismatch",
      message: "Resolved task is not compatible with the selected agent and intent.",
    };
  }

  const agentResult = request.context.agentResult;
  if (agentResult.status !== "completed") {
    return {
      allowed: false,
      code: "unsafe_llm_context",
      message: "Agent result must be completed before LLM generation.",
    };
  }

  if (
    agentResult.safeForClient !== true ||
    agentResult.hasToken !== false ||
    agentResult.rawProviderDataUsed !== false ||
    agentResult.persisted !== false
  ) {
    return {
      allowed: false,
      code: "unsafe_llm_context",
      message: "Agent result context is not client-safe.",
    };
  }

  // Scan only client-derived context. The agent result is server-authored and already
  // guaranteed client-safe via the flags checked above; it legitimately carries an
  // execution plan that must never be sent to the provider (the envelope excludes it).
  const clientDerivedContext = {
    careerBundle: request.context.careerBundle,
    selectedSignalIds: request.context.selectedSignalIds,
    selectedSignalSummaries: request.context.selectedSignalSummaries,
    userMessage: request.context.userMessage,
  };

  if (scanCareerLlmPayloadForForbiddenKeys(clientDerivedContext).length > 0) {
    return {
      allowed: false,
      code: "unsafe_llm_context",
      message: "LLM context contains forbidden provider or secret fields.",
    };
  }

  const message = request.context.userMessage.trim();
  if (message.length === 0 || message.length > CAREER_CHAT_MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      code: "invalid_llm_input",
      message: "User message is empty or exceeds the allowed length.",
    };
  }

  return { allowed: true };
}
