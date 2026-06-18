import type { LibreChatTransportConfig } from "./types";

export const LIBRECHAT_TRANSPORT_DEFAULT_TIMEOUT_MS = 10_000;

type LibreChatTransportEnv = {
  LIBRECHAT_TRANSPORT_ENABLED?: string;
  LIBRECHAT_BASE_URL?: string;
  LIBRECHAT_API_KEY?: string;
  LIBRECHAT_TIMEOUT_MS?: string;
};

export function isLibreChatTransportEnabled(
  env: LibreChatTransportEnv = process.env,
): boolean {
  return env.LIBRECHAT_TRANSPORT_ENABLED === "true";
}

export function resolveLibreChatTransportConfig(
  env: LibreChatTransportEnv = process.env,
): LibreChatTransportConfig {
  const baseUrl = typeof env.LIBRECHAT_BASE_URL === "string" ? env.LIBRECHAT_BASE_URL.trim() : "";
  const apiKey = typeof env.LIBRECHAT_API_KEY === "string" ? env.LIBRECHAT_API_KEY : "";
  const timeoutMs = Number.parseInt(env.LIBRECHAT_TIMEOUT_MS ?? "", 10);

  return {
    enabled: isLibreChatTransportEnabled(env),
    baseUrl,
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : LIBRECHAT_TRANSPORT_DEFAULT_TIMEOUT_MS,
    configured: baseUrl.length > 0 && apiKey.length > 0,
  };
}

export function resolveLibreChatTransportApiKey(
  env: LibreChatTransportEnv = process.env,
): string {
  return typeof env.LIBRECHAT_API_KEY === "string" ? env.LIBRECHAT_API_KEY : "";
}
