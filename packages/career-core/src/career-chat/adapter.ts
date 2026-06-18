import { orchestrateCareerAgents } from "../career-agents/orchestrator.js";
import type { CareerAgentOrchestrationBody } from "../career-agents/schemas.js";
import { normalizeCareerChatRequest } from "./normalize.js";
import type { LibreChatCareerChatBody } from "./schemas.js";
import { scanCareerChatPayloadForForbiddenKeys } from "./security.js";
import {
  appendCareerChatTraceStep,
  createCareerChatTrace,
  createCareerChatTraceStep,
} from "./trace.js";
import { resolveCareerChatToolProposals } from "./tool-proposals.js";
import type { CareerChatNormalizedInput, CareerChatResponse, CareerChatWarning } from "./types.js";

function blockedResponse(input: {
  conversationId: string;
  intent: CareerChatResponse["intent"];
  warnings: CareerChatWarning[];
  trace: CareerChatResponse["trace"];
}): CareerChatResponse {
  return {
    status: "blocked",
    provider: "librechat",
    conversationId: input.conversationId,
    intent: input.intent,
    agentResult: null,
    toolProposals: [],
    warnings: input.warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace: input.trace,
  };
}

export function buildCareerAgentOrchestrationFromChat(
  normalized: CareerChatNormalizedInput,
): CareerAgentOrchestrationBody {
  return {
    intent: normalized.action,
    explicitConsent: true,
    context: {
      careerBundle: normalized.context.careerBundle,
      selectedSignalIds: normalized.context.selectedSignalIds,
      availableSignals: normalized.context.availableSignals,
    },
  };
}

export function runLibreChatCareerAdapter(input: {
  body: LibreChatCareerChatBody;
  requestedAt: string;
  adapterEnabled: boolean;
}): CareerChatResponse {
  const conversationSeed = input.body.conversationId ?? "pending";
  let trace = createCareerChatTrace(conversationSeed);

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: "completed",
      code: "chat_request_received",
      message: "LibreChat-compatible chat request received.",
    }),
  );

  if (!input.adapterEnabled) {
    trace = appendCareerChatTraceStep(
      trace,
      createCareerChatTraceStep({
        timestamp: input.requestedAt,
        status: "blocked",
        code: "human_review_required",
        message: "Adapter is disabled by feature flag.",
      }),
    );

    return blockedResponse({
      conversationId: conversationSeed,
      intent: "unknown",
      warnings: [
        {
          code: "librechat_adapter_disabled",
          message: "LibreChat adapter is disabled.",
        },
      ],
      trace,
    });
  }

  if (scanCareerChatPayloadForForbiddenKeys(input.body).length > 0) {
    return blockedResponse({
      conversationId: conversationSeed,
      intent: "unknown",
      warnings: [
        {
          code: "unsafe_chat_context",
          message: "Chat payload contains unsafe fields.",
        },
      ],
      trace: appendCareerChatTraceStep(
        trace,
        createCareerChatTraceStep({
          timestamp: input.requestedAt,
          status: "blocked",
          code: "chat_request_normalized",
          message: "Unsafe chat payload rejected.",
        }),
      ),
    });
  }

  const normalized = normalizeCareerChatRequest({
    provider: "librechat",
    body: input.body,
  });

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: normalized.ok ? "completed" : "blocked",
      code: "chat_request_normalized",
      message: normalized.ok ? "Chat request normalized." : normalized.message,
    }),
  );

  if (!normalized.ok) {
    return blockedResponse({
      conversationId: conversationSeed,
      intent: "unknown",
      warnings: [{ code: normalized.code, message: normalized.message }],
      trace,
    });
  }

  trace = {
    ...trace,
    conversationId: normalized.value.conversationId,
  };

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: "completed",
      code: "intent_resolved",
      message: `Resolved intent ${normalized.value.action}.`,
    }),
  );

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: "completed",
      code: "orchestration_started",
      message: "Starting career agent orchestration.",
    }),
  );

  const orchestrationBody = buildCareerAgentOrchestrationFromChat(normalized.value);
  const agentResult = orchestrateCareerAgents(orchestrationBody, input.requestedAt);

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: agentResult.status === "completed" ? "completed" : "blocked",
      code: "orchestration_completed",
      message:
        agentResult.status === "completed"
          ? "Career agent orchestration completed."
          : "Career agent orchestration blocked.",
    }),
  );

  const toolProposals = resolveCareerChatToolProposals({
    intent: normalized.value.action,
    normalized: normalized.value,
    executionPlan: agentResult.executionPlan,
    agentCompleted: agentResult.status === "completed",
  });

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: "completed",
      code: "tool_proposals_resolved",
      message: `Resolved ${toolProposals.length} tool proposal(s).`,
    }),
  );

  trace = appendCareerChatTraceStep(
    trace,
    createCareerChatTraceStep({
      timestamp: input.requestedAt,
      status: "completed",
      code: "human_review_required",
      message: "Human review is required before any tool execution.",
    }),
  );

  const warnings: CareerChatWarning[] =
    agentResult.status === "blocked"
      ? agentResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
        }))
      : [];

  return {
    status: agentResult.status === "completed" ? "completed" : "blocked",
    provider: "librechat",
    conversationId: normalized.value.conversationId,
    intent: normalized.value.action,
    agentResult,
    toolProposals,
    warnings,
    reviewRequired: true,
    safeForClient: true,
    hasToken: false,
    persisted: false,
    executedExternally: false,
    trace,
  };
}
