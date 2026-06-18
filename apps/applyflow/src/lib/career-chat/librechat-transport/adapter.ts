import {
  CAREER_CHAT_ACTIONS,
  parseLibreChatCareerChatBody,
  type CareerChatResponse,
  type LibreChatCareerChatBody,
} from "@devflow/career-core";
import { resolveLibreChatTransportApiKey } from "./config";
import {
  hasClientAuthorizationHeader,
  scanLibreChatTransportPayloadForForbiddenKeys,
} from "./security";
import type {
  LibreChatTransportConfig,
  LibreChatTransportDeliveryResult,
  LibreChatTransportError,
  LibreChatTransportHealthStatus,
  LibreChatTransportOpenAiEnvelope,
  LibreChatTransportRequest,
  LibreChatTransportResponse,
} from "./types";

export type LibreChatTransportAdapterOptions = {
  config: LibreChatTransportConfig;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

function isCareerChatAction(value: string): value is LibreChatCareerChatBody["action"] {
  return (CAREER_CHAT_ACTIONS as readonly string[]).includes(value);
}

function buildTransportError(
  code: LibreChatTransportError["code"],
  message: string,
): LibreChatTransportError {
  return { code, message };
}

function extractUserMessage(messages: LibreChatTransportOpenAiEnvelope["messages"]): string | null {
  if (!Array.isArray(messages)) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index];
    if (entry?.role === "user" && typeof entry.content === "string" && entry.content.trim().length > 0) {
      return entry.content.trim();
    }
  }

  return null;
}

export class LibreChatTransportAdapter {
  private readonly config: LibreChatTransportConfig;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LibreChatTransportAdapterOptions) {
    this.config = options.config;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  resolveInboundAuth(headers: Headers):
    | { ok: true; source: "ui" | "librechat_server" }
    | { ok: false; error: LibreChatTransportError } {
    if (!hasClientAuthorizationHeader(headers)) {
      return { ok: true, source: "ui" };
    }

    if (!this.config.enabled) {
      return {
        ok: false,
        error: buildTransportError(
          "client_authorization_rejected",
          "Client Authorization headers are not accepted on this boundary.",
        ),
      };
    }

    const authorization = headers.get("authorization") ?? headers.get("Authorization") ?? "";
    const expected = this.apiKey.length > 0 ? `Bearer ${this.apiKey}` : "";

    if (!expected || authorization !== expected) {
      return {
        ok: false,
        error: buildTransportError(
          "transport_auth_failed",
          "LibreChat transport authentication failed.",
        ),
      };
    }

    return { ok: true, source: "librechat_server" };
  }

  mapInboundToCareerChatBody(body: unknown):
    | { ok: true; body: LibreChatCareerChatBody; format: "career_chat" | "librechat_openai" }
    | { ok: false; error: LibreChatTransportError } {
    if (scanLibreChatTransportPayloadForForbiddenKeys(body).length > 0) {
      return {
        ok: false,
        error: buildTransportError(
          "unsafe_transport_payload",
          "Transport payload contains unsafe fields.",
        ),
      };
    }

    const direct = parseLibreChatCareerChatBody(body);
    if (direct.ok) {
      return { ok: true, body: direct.value, format: "career_chat" };
    }

    if (typeof body !== "object" || body == null) {
      return {
        ok: false,
        error: buildTransportError(
          "invalid_transport_request",
          "Transport payload is not a valid career chat request.",
        ),
      };
    }

    const envelope = body as LibreChatTransportOpenAiEnvelope;
    const message = extractUserMessage(envelope.messages);
    const action = envelope.career?.action;
    const explicitConsent = envelope.career?.explicitConsent;
    const context = envelope.career?.context;

    if (!message || typeof action !== "string" || !isCareerChatAction(action)) {
      return {
        ok: false,
        error: buildTransportError(
          "invalid_transport_request",
          "LibreChat transport envelope requires a user message and supported career action.",
        ),
      };
    }

    if (explicitConsent !== true || context == null) {
      return {
        ok: false,
        error: buildTransportError(
          "invalid_transport_request",
          "LibreChat transport envelope requires explicit consent and context.",
        ),
      };
    }

    const mapped = parseLibreChatCareerChatBody({
      action,
      message,
      explicitConsent: true,
      conversationId: envelope.career?.conversationId,
      context,
    });

    if (!mapped.ok) {
      return {
        ok: false,
        error: buildTransportError(
          "invalid_transport_request",
          "LibreChat transport envelope could not be mapped to the career chat boundary.",
        ),
      };
    }

    return { ok: true, body: mapped.value, format: "librechat_openai" };
  }

  mapCareerChatResponseToTransport(
    careerChat: CareerChatResponse,
    format: "career_chat" | "librechat_openai",
    externalCall: boolean,
    error?: LibreChatTransportError,
  ): LibreChatTransportResponse {
    const summary =
      careerChat.agentResult?.summary ??
      careerChat.warnings.map((warning) => warning.message).join(" ") ??
      "Career chat response ready for human review.";

    const base: LibreChatTransportResponse = {
      ok: careerChat.status === "completed" && !error,
      format,
      careerChat,
      reviewRequired: true,
      safeForClient: true,
      hasToken: false,
      persisted: false,
      executedExternally: externalCall,
      error,
    };

    if (format === "librechat_openai") {
      return {
        ...base,
        openAi: {
          id: `career-chat-${careerChat.conversationId}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "career-chat-boundary",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  status: careerChat.status,
                  intent: careerChat.intent,
                  summary,
                  toolProposals: careerChat.toolProposals,
                  reviewRequired: true,
                  warnings: careerChat.warnings,
                }),
              },
              finish_reason: "stop",
            },
          ],
        },
      };
    }

    return base;
  }

  async checkHealth(adapterEnabled: boolean): Promise<LibreChatTransportHealthStatus> {
    if (!this.config.enabled) {
      return {
        transportEnabled: false,
        adapterEnabled,
        configured: this.config.configured,
        reachable: false,
        latencyMs: null,
        upstreamStatus: null,
        safeForClient: true,
        hasToken: false,
      };
    }

    if (!this.config.configured) {
      return {
        transportEnabled: true,
        adapterEnabled,
        configured: false,
        reachable: false,
        latencyMs: null,
        upstreamStatus: null,
        safeForClient: true,
        hasToken: false,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await this.fetchImpl(new URL("/health", this.config.baseUrl).toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      return {
        transportEnabled: true,
        adapterEnabled,
        configured: true,
        reachable: response.ok,
        latencyMs: Date.now() - startedAt,
        upstreamStatus: response.status,
        safeForClient: true,
        hasToken: false,
      };
    } catch {
      return {
        transportEnabled: true,
        adapterEnabled,
        configured: true,
        reachable: false,
        latencyMs: Date.now() - startedAt,
        upstreamStatus: null,
        safeForClient: true,
        hasToken: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createLibreChatTransportAdapter(
  config: LibreChatTransportConfig,
  env: { LIBRECHAT_API_KEY?: string } = process.env,
  fetchImpl?: typeof fetch,
): LibreChatTransportAdapter {
  return new LibreChatTransportAdapter({
    config,
    apiKey: resolveLibreChatTransportApiKey(env),
    fetchImpl,
  });
}
