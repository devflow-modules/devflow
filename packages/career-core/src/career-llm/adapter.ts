import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { orchestrateCareerAgents } from "../career-agents/orchestrator.js";
import { normalizeCareerChatRequest } from "../career-chat/normalize.js";
import { evaluateCareerLlmPolicy } from "./policy.js";
import { buildCareerLlmPromptEnvelope } from "./prompt-envelope.js";
import type { CareerLlmGenerateBody } from "./schemas.js";
import { detectCareerLlmPromptInjection } from "./security.js";
import { resolveCareerLlmTask } from "./task-mapping.js";
import {
  appendCareerLlmTraceStep,
  createCareerLlmTrace,
  createCareerLlmTraceStep,
} from "./trace.js";
import { validateCareerLlmStructuredOutput } from "./structured-output.js";
import type {
  CareerLlmContext,
  CareerLlmPolicyBlockCode,
  CareerLlmProviderAdapter,
  CareerLlmProviderConfig,
  CareerLlmRequest,
  CareerLlmResult,
  CareerLlmTrace,
  CareerLlmWarning,
} from "./types.js";

function blockedResult(input: {
  provider: CareerLlmResult["provider"];
  task: CareerLlmResult["task"];
  agent: CareerLlmResult["agent"];
  warnings: CareerLlmWarning[];
  trace: CareerLlmTrace;
  externalProviderCalled?: boolean;
}): CareerLlmResult {
  return {
    status: "blocked",
    provider: input.provider,
    task: input.task,
    agent: input.agent,
    output: null,
    warnings: input.warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: input.externalProviderCalled ?? false,
    externalProviderCalled: input.externalProviderCalled ?? false,
    toolExecutionOccurred: false,
    trace: input.trace,
  };
}

function buildSelectedSignalSummaries(
  selectedSignalIds: readonly string[],
  availableSignals: readonly ProviderDerivedSignal[] | undefined,
): string[] {
  if (!availableSignals || availableSignals.length === 0) {
    return [];
  }

  const selected = new Set(selectedSignalIds);
  return availableSignals
    .filter((signal) => selected.has(signal.id))
    .map((signal) => `${signal.source}:${signal.kind}@${signal.occurredAt}`);
}

export async function runCareerLlmGeneration(input: {
  body: CareerLlmGenerateBody;
  requestedAt: string;
  adapterEnabled: boolean;
  providerConfig: CareerLlmProviderConfig;
  provider: CareerLlmProviderAdapter;
}): Promise<CareerLlmResult> {
  const { body, requestedAt, adapterEnabled, providerConfig, provider } = input;
  const requestId = body.agentRequestId ?? "career-llm-pending";
  const providerName = providerConfig.provider;

  let trace = createCareerLlmTrace(requestId);
  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "llm_request_received",
      message: "Controlled LLM generation request received.",
    }),
  );

  if (!adapterEnabled) {
    return blockedResult({
      provider: providerName,
      task: "unsupported_llm_task",
      agent: "career_orchestrator",
      warnings: [{ code: "llm_disabled", message: "Controlled LLM boundary is disabled." }],
      trace: appendCareerLlmTraceStep(
        trace,
        createCareerLlmTraceStep({
          timestamp: requestedAt,
          status: "blocked",
          code: "llm_policy_evaluated",
          message: "Controlled LLM boundary is disabled by feature flag.",
        }),
      ),
    });
  }

  const normalized = normalizeCareerChatRequest({
    provider: "librechat",
    body: {
      action: body.chatRequest.action,
      message: body.chatRequest.message,
      explicitConsent: true,
      context: body.context,
    },
  });

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: normalized.ok ? "completed" : "blocked",
      code: "chat_request_normalized",
      message: normalized.ok ? "Chat request normalized." : normalized.message,
    }),
  );

  if (!normalized.ok) {
    return blockedResult({
      provider: providerName,
      task: "unsupported_llm_task",
      agent: "career_orchestrator",
      warnings: [{ code: "invalid_llm_input", message: normalized.message }],
      trace,
    });
  }

  const agentResult = orchestrateCareerAgents(
    {
      intent: normalized.value.action,
      explicitConsent: true,
      context: normalized.value.context,
    },
    requestedAt,
  );

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: agentResult.status === "completed" ? "completed" : "blocked",
      code: "agent_orchestration_completed",
      message:
        agentResult.status === "completed"
          ? `Agent ${agentResult.agent} completed orchestration.`
          : "Agent orchestration blocked.",
    }),
  );

  if (agentResult.status !== "completed") {
    return blockedResult({
      provider: providerName,
      task: "unsupported_llm_task",
      agent: agentResult.agent,
      warnings: agentResult.warnings.map((warning) => ({ code: warning.code, message: warning.message })),
      trace,
    });
  }

  const taskResolution = resolveCareerLlmTask(agentResult.agent, normalized.value.action);

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: taskResolution.ok ? "completed" : "blocked",
      code: "llm_task_resolved",
      message: taskResolution.ok ? `Resolved task ${taskResolution.task}.` : taskResolution.message,
    }),
  );

  if (!taskResolution.ok) {
    return blockedResult({
      provider: providerName,
      task: "unsupported_llm_task",
      agent: agentResult.agent,
      warnings: [{ code: taskResolution.code, message: taskResolution.message }],
      trace,
    });
  }

  const context: CareerLlmContext = {
    careerBundle: normalized.value.context.careerBundle,
    agentResult,
    selectedSignalIds: normalized.value.context.selectedSignalIds,
    selectedSignalSummaries: buildSelectedSignalSummaries(
      normalized.value.context.selectedSignalIds,
      normalized.value.context.availableSignals,
    ),
    userMessage: normalized.value.message.content,
  };

  const request: CareerLlmRequest = {
    requestId,
    provider: providerName,
    task: taskResolution.task,
    agent: agentResult.agent,
    intent: normalized.value.action,
    explicitConsent: true,
    context,
  };

  const policy = evaluateCareerLlmPolicy({ request, adapterEnabled, providerConfig });

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: policy.allowed ? "completed" : "blocked",
      code: "llm_policy_evaluated",
      message: policy.allowed ? "LLM policy evaluation passed." : policy.message ?? "LLM policy blocked.",
    }),
  );

  if (!policy.allowed) {
    return blockedResult({
      provider: providerName,
      task: request.task,
      agent: request.agent,
      warnings: [
        {
          code: policy.code ?? ("unsafe_llm_context" as CareerLlmPolicyBlockCode),
          message: policy.message ?? "LLM policy blocked the request.",
        },
      ],
      trace,
    });
  }

  const warnings: CareerLlmWarning[] = [];
  if (detectCareerLlmPromptInjection(request.context.userMessage)) {
    warnings.push({
      code: "prompt_injection_pattern_detected",
      message:
        "A prompt-injection pattern was detected in the user message. Constraints and structured output remain enforced.",
    });
  }

  const envelope = buildCareerLlmPromptEnvelope(request);

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "prompt_envelope_created",
      message: "Server-owned prompt envelope created.",
    }),
  );

  let providerResponse;
  try {
    providerResponse = await provider.generate({
      task: request.task,
      envelope,
      modelAlias: providerConfig.modelAlias,
      temperature: providerConfig.temperature,
      maxOutputTokens: providerConfig.maxOutputTokens,
      timeoutMs: providerConfig.timeoutMs,
    });
  } catch {
    return blockedResult({
      provider: providerName,
      task: request.task,
      agent: request.agent,
      warnings: [
        ...warnings,
        { code: "provider_request_failed", message: "Provider request failed." },
      ],
      trace: appendCareerLlmTraceStep(
        trace,
        createCareerLlmTraceStep({
          timestamp: requestedAt,
          status: "blocked",
          code: "provider_called",
          message: "Provider request threw an error.",
        }),
      ),
      externalProviderCalled: false,
    });
  }

  const externalProviderCalled = providerResponse.externalCall === true;

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: externalProviderCalled ? "completed" : "simulated",
      code: "provider_called",
      message: externalProviderCalled
        ? `Provider ${providerName} returned a response.`
        : `Provider ${providerName} produced a simulated response.`,
    }),
  );

  if (!providerResponse.ok) {
    return blockedResult({
      provider: providerName,
      task: request.task,
      agent: request.agent,
      warnings: [
        ...warnings,
        {
          code: providerResponse.error?.code ?? "provider_request_failed",
          message: providerResponse.error?.message ?? "Provider request failed.",
        },
      ],
      trace,
      externalProviderCalled,
    });
  }

  const validation = validateCareerLlmStructuredOutput(providerResponse.output);

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: validation.ok ? "completed" : "blocked",
      code: "structured_output_validated",
      message: validation.ok
        ? "Structured output validated against schema and limits."
        : validation.message,
    }),
  );

  if (!validation.ok) {
    return blockedResult({
      provider: providerName,
      task: request.task,
      agent: request.agent,
      warnings: [...warnings, { code: validation.code, message: validation.message }],
      trace,
      externalProviderCalled,
    });
  }

  trace = appendCareerLlmTraceStep(
    trace,
    createCareerLlmTraceStep({
      timestamp: requestedAt,
      status: "completed",
      code: "human_review_required",
      message: "Human review is required before any downstream action.",
    }),
  );

  return {
    status: "completed",
    provider: providerName,
    task: request.task,
    agent: request.agent,
    output: validation.value,
    warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: externalProviderCalled,
    externalProviderCalled,
    toolExecutionOccurred: false,
    trace,
    observability: {
      provider: providerName,
      modelAlias: providerResponse.modelAlias ?? providerConfig.modelAlias,
      durationMs: providerResponse.durationMs ?? 0,
      outputItemCount: validation.value.findings.length + validation.value.recommendations.length,
      validationStatus: "valid",
      usage: providerResponse.usage,
    },
  };
}
