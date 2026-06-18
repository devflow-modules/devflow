import type { CareerChatResponse, LibreChatCareerChatBody } from "@devflow/career-core";

export type LibreChatTransportErrorCode =
  | "transport_disabled"
  | "transport_not_configured"
  | "invalid_transport_request"
  | "unsafe_transport_payload"
  | "client_authorization_rejected"
  | "transport_auth_failed"
  | "transport_timeout"
  | "transport_upstream_unauthorized"
  | "transport_upstream_forbidden"
  | "transport_upstream_error"
  | "transport_invalid_json"
  | "transport_request_failed";

export type LibreChatTransportError = {
  code: LibreChatTransportErrorCode;
  message: string;
};

export type LibreChatTransportConfig = {
  enabled: boolean;
  baseUrl: string;
  timeoutMs: number;
  configured: boolean;
};

export type LibreChatTransportOpenAiEnvelope = {
  model?: string;
  messages?: Array<{ role?: string; content?: string }>;
  stream?: boolean;
  career?: {
    action?: string;
    explicitConsent?: boolean;
    conversationId?: string;
    context?: LibreChatCareerChatBody["context"];
  };
};

export type LibreChatTransportRequest = {
  body: unknown;
  headers: Headers;
  requestedAt: string;
};

export type LibreChatTransportDeliveryResult = {
  ok: boolean;
  careerChat: CareerChatResponse;
  transportResponse: LibreChatTransportResponse;
  error?: LibreChatTransportError;
  externalCall: boolean;
  durationMs?: number;
};

export type LibreChatTransportResponse = {
  ok: boolean;
  format: "career_chat" | "librechat_openai";
  careerChat: CareerChatResponse;
  openAi?: {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: Array<{
      index: number;
      message: { role: "assistant"; content: string };
      finish_reason: "stop";
    }>;
  };
  error?: LibreChatTransportError;
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: false;
  executedExternally: boolean;
};

export type LibreChatTransportHealthStatus = {
  transportEnabled: boolean;
  adapterEnabled: boolean;
  configured: boolean;
  reachable: boolean;
  latencyMs: number | null;
  upstreamStatus: number | null;
  safeForClient: true;
  hasToken: false;
};
