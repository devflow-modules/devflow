import {
  type CareerAutomationAdapter,
  type CareerAutomationAdapterErrorCode,
  type CareerAutomationAdapterRequest,
  type CareerAutomationAdapterResponse,
} from "@devflow/career-core";
import { scanOpenClawPayloadForForbiddenKeys } from "./openclaw-security";

/**
 * Controlled, single-execution OpenClaw automation adapter (server-side only).
 *
 * This adapter delivers exactly one server-approved, allowlisted automation to a real
 * OpenClaw transport over HTTP. It never opens sockets, schedules jobs, retries, streams,
 * runs callbacks/webhooks, or requests additional steps. The API key and base URL stay
 * server-side and are never serialized into the response. `externalCall` is true once the
 * transport is contacted — that means remote execution of a single permitted tool, never
 * tool selection by the provider. Retry is disabled in this boundary: a new attempt
 * requires a new explicit approval.
 */

const OPENCLAW_EXECUTIONS_PATH = "/v1/executions";

/** Top-level response fields that imply a second step or unsafe execution control. */
const FORBIDDEN_RESPONSE_FIELDS = [
  "nextAction",
  "next_action",
  "toolCalls",
  "tool_calls",
  "functionCall",
  "function_call",
  "command",
  "commands",
  "shell",
  "script",
  "schedule",
  "cron",
  "background",
  "callback",
  "callbackUrl",
  "webhook",
  "webhookUrl",
  "memory",
  "session",
  "filesystem",
  "path",
  "url",
] as const;

export type OpenClawCareerAutomationAdapterOptions = {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

type AdapterError = { code: CareerAutomationAdapterErrorCode; message: string };

type OpenClawExecutionResponse = {
  status?: string;
  proposalId?: string;
  automationKind?: string;
  toolName?: string;
  result?: unknown;
  warnings?: unknown;
  durationMs?: number;
};

function localError(code: CareerAutomationAdapterErrorCode, message: string): CareerAutomationAdapterResponse {
  return { ok: false, externalCall: false, data: {}, retryCount: 0, error: { code, message } };
}

function externalError(
  code: CareerAutomationAdapterErrorCode,
  message: string,
  durationMs: number,
): CareerAutomationAdapterResponse {
  return { ok: false, externalCall: true, data: {}, durationMs, retryCount: 0, error: { code, message } };
}

class OpenClawCareerAutomationAdapter implements CareerAutomationAdapter {
  public readonly provider = "openclaw" as const;

  constructor(private readonly options: OpenClawCareerAutomationAdapterOptions) {}

  async execute(input: CareerAutomationAdapterRequest): Promise<CareerAutomationAdapterResponse> {
    if (!this.options.enabled) {
      return localError("openclaw_disabled", "OpenClaw provider is disabled by feature flag.");
    }

    if (this.options.apiKey.length === 0 || this.options.baseUrl.length === 0) {
      return localError("openclaw_not_configured", "OpenClaw provider requires a server-side API key and base URL.");
    }

    const envelope = {
      requestId: input.toolInvocation.agentRequestId,
      proposalId: input.proposal.proposalId,
      automationKind: input.proposal.kind,
      approvedTool: input.proposal.requestedTool,
      approvedCapability: input.proposal.requiredCapability,
      sanitizedInput: input.toolInvocation.input,
      executionMode: "single_execution" as const,
      reviewRequired: true as const,
    };

    if (scanOpenClawPayloadForForbiddenKeys(envelope.sanitizedInput).length > 0) {
      return localError("openclaw_request_failed", "OpenClaw envelope input failed the safety scan.");
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetchImpl(`${this.options.baseUrl}${OPENCLAW_EXECUTIONS_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(envelope),
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const aborted = error instanceof Error && error.name === "AbortError";
      return aborted
        ? externalError("openclaw_timeout", "OpenClaw request timed out.", durationMs)
        : externalError("openclaw_unreachable", "OpenClaw transport was unreachable.", durationMs);
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const error = mapHttpStatusToError(response.status);
      return externalError(error.code, error.message, durationMs);
    }

    let payload: OpenClawExecutionResponse;
    try {
      payload = (await response.json()) as OpenClawExecutionResponse;
    } catch {
      return externalError("openclaw_response_invalid", "OpenClaw returned a non-JSON response body.", durationMs);
    }

    const validation = this.validateResponse(payload, envelope);
    if (validation) {
      return externalError(validation.code, validation.message, durationMs);
    }

    return {
      ok: true,
      externalCall: true,
      data: payload.result as Record<string, unknown>,
      durationMs,
      retryCount: 0,
    };
  }

  private validateResponse(
    payload: OpenClawExecutionResponse,
    envelope: { proposalId: string; automationKind: string; approvedTool: string },
  ): AdapterError | null {
    if (payload.status !== "completed" && payload.status !== "ok") {
      return { code: "openclaw_response_invalid", message: "OpenClaw response status was not a completed execution." };
    }

    if (payload.proposalId !== envelope.proposalId) {
      return { code: "openclaw_proposal_mismatch", message: "OpenClaw response proposal did not match the approved proposal." };
    }

    if (payload.automationKind !== envelope.automationKind) {
      return { code: "openclaw_response_invalid", message: "OpenClaw response automation kind did not match." };
    }

    if (payload.toolName !== envelope.approvedTool) {
      return { code: "openclaw_tool_mismatch", message: "OpenClaw response tool did not match the approved tool." };
    }

    if (payload.result == null || typeof payload.result !== "object" || Array.isArray(payload.result)) {
      return { code: "openclaw_response_invalid", message: "OpenClaw response result was not a structured object." };
    }

    const topLevel = payload as Record<string, unknown>;
    for (const field of FORBIDDEN_RESPONSE_FIELDS) {
      if (field in topLevel) {
        return { code: "openclaw_unsafe_response", message: "OpenClaw response requested an additional or unsafe step." };
      }
    }

    if (scanOpenClawPayloadForForbiddenKeys(payload.result).length > 0) {
      return { code: "openclaw_unsafe_response", message: "OpenClaw response result contained an unsafe field." };
    }

    return null;
  }
}

function mapHttpStatusToError(status: number): AdapterError {
  if (status === 401 || status === 403) {
    return { code: "openclaw_auth_failed", message: "OpenClaw rejected the server credentials." };
  }
  return { code: "openclaw_request_failed", message: `OpenClaw returned status ${status}.` };
}

export function createOpenClawCareerAutomationAdapter(
  options: OpenClawCareerAutomationAdapterOptions,
): CareerAutomationAdapter {
  return new OpenClawCareerAutomationAdapter(options);
}
