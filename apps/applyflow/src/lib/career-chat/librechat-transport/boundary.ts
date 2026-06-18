import type { CareerChatResponse, LibreChatCareerChatBody } from "@devflow/career-core";
import {
  createBlockedCareerChatResponse,
  handleCareerChatLibrechat,
  isLibreChatAdapterEnabled,
  resolveCareerChatLibrechatHttpStatus,
} from "../career-chat-librechat-boundary";
import { createLibreChatTransportAdapter } from "./adapter";
import { isLibreChatTransportEnabled, resolveLibreChatTransportConfig } from "./config";
import type {
  LibreChatTransportDeliveryResult,
  LibreChatTransportHealthStatus,
  LibreChatTransportRequest,
  LibreChatTransportResponse,
} from "./types";

type LibreChatTransportEnv = {
  [key: string]: string | undefined;
  LIBRECHAT_ADAPTER_ENABLED?: string;
  LIBRECHAT_TRANSPORT_ENABLED?: string;
  LIBRECHAT_BASE_URL?: string;
  LIBRECHAT_API_KEY?: string;
  LIBRECHAT_TIMEOUT_MS?: string;
};

function createTransportBlockedCareerChat(
  warningCode: string,
  message: string,
): CareerChatResponse {
  const blocked = createBlockedCareerChatResponse(warningCode);
  return {
    ...blocked,
    warnings: [{ code: warningCode, message }],
  };
}

export function resolveLibreChatTransportHealth(
  env: LibreChatTransportEnv = process.env,
  fetchImpl?: typeof fetch,
): Promise<LibreChatTransportHealthStatus> {
  const adapter = createLibreChatTransportAdapter(resolveLibreChatTransportConfig(env), env, fetchImpl);
  return adapter.checkHealth(isLibreChatAdapterEnabled(env));
}

export async function handleLibreChatTransportRequest(
  input: LibreChatTransportRequest,
  env: LibreChatTransportEnv = process.env,
  fetchImpl?: typeof fetch,
): Promise<{
  httpStatus: number;
  payload: CareerChatResponse | LibreChatTransportResponse;
}> {
  const transportConfig = resolveLibreChatTransportConfig(env);
  const transportAdapter = createLibreChatTransportAdapter(transportConfig, env, fetchImpl);
  const adapterEnabled = isLibreChatAdapterEnabled(env);
  const startedAt = Date.now();
  const hasAuthorization = input.headers.has("authorization") || input.headers.has("Authorization");

  if (hasAuthorization && isLibreChatTransportEnabled(env) && !transportConfig.configured) {
    const error = {
      code: "transport_not_configured" as const,
      message: "LibreChat transport is enabled but not configured.",
    };
    const careerChat = createTransportBlockedCareerChat(error.code, error.message);
    const transportResponse = transportAdapter.mapCareerChatResponseToTransport(
      careerChat,
      "career_chat",
      false,
      error,
    );
    return { httpStatus: 503, payload: transportResponse };
  }

  const auth = transportAdapter.resolveInboundAuth(input.headers);
  if (!auth.ok) {
    const careerChat = createTransportBlockedCareerChat(
      auth.error.code,
      auth.error.message,
    );
    const transportResponse = transportAdapter.mapCareerChatResponseToTransport(
      careerChat,
      "career_chat",
      false,
      auth.error,
    );
    return {
      httpStatus: auth.error.code === "client_authorization_rejected" ? 403 : 401,
      payload: transportResponse,
    };
  }

  const mapped = transportAdapter.mapInboundToCareerChatBody(input.body);
  if (!mapped.ok) {
    const careerChat = createTransportBlockedCareerChat(
      mapped.error.code,
      mapped.error.message,
    );
    const transportResponse = transportAdapter.mapCareerChatResponseToTransport(
      careerChat,
      "career_chat",
      false,
      mapped.error,
    );
    return {
      httpStatus: 403,
      payload: transportResponse,
    };
  }

  let externalCall = false;
  if (auth.source === "librechat_server" && transportConfig.enabled && transportConfig.configured) {
    const health = await transportAdapter.checkHealth(adapterEnabled);
    externalCall = health.reachable;
  }

  const careerChat = handleCareerChatLibrechat(mapped.body, input.requestedAt, adapterEnabled);

  if (auth.source === "librechat_server" && transportConfig.enabled) {
    const transportResponse = transportAdapter.mapCareerChatResponseToTransport(
      careerChat,
      mapped.format,
      externalCall,
    );
    return {
      httpStatus: resolveCareerChatLibrechatHttpStatus(careerChat),
      payload: {
        ...transportResponse,
        durationMs: Date.now() - startedAt,
      } as LibreChatTransportResponse & { durationMs: number },
    };
  }

  return {
    httpStatus: resolveCareerChatLibrechatHttpStatus(careerChat),
    payload: careerChat,
  };
}

export function deliverCareerChatThroughTransport(
  body: LibreChatCareerChatBody,
  requestedAt: string,
  adapterEnabled: boolean,
): CareerChatResponse {
  return handleCareerChatLibrechat(body, requestedAt, adapterEnabled);
}

export type { LibreChatTransportDeliveryResult };
