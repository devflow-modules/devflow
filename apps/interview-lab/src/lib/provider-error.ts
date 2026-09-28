/**
 * Interview Lab — OpenAI provider boundary errors (AF-AI-002).
 *
 * Provider-controlled response bodies never become UI text.
 * Callers map {@link ProviderError.code} via {@link providerErrorUserMessage}.
 */

export type ProviderErrorCode =
  | "provider_auth_failed"
  | "provider_rate_limited"
  | "provider_timeout"
  | "provider_unavailable"
  | "provider_invalid_response"
  | "provider_error";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;

  constructor(code: ProviderErrorCode, status?: number) {
    super(code);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

/** Map HTTP status from the OpenAI chat completions endpoint to a domain code. */
export function classifyProviderHttpStatus(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return "provider_auth_failed";
  if (status === 429) return "provider_rate_limited";
  if (status >= 500 && status <= 599) return "provider_unavailable";
  return "provider_error";
}

export function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "AbortError";
}

/** Controlled UI copy — never derived from provider response bodies. */
export function providerErrorUserMessage(code: ProviderErrorCode): string {
  switch (code) {
    case "provider_auth_failed":
      return "API key rejected. Check your OpenAI key.";
    case "provider_rate_limited":
      return "OpenAI rate limit reached. Try again later.";
    case "provider_timeout":
      return "OpenAI request timed out. Try again.";
    case "provider_unavailable":
      return "OpenAI is temporarily unavailable.";
    case "provider_invalid_response":
      return "The provider returned an invalid response.";
    case "provider_error":
    default:
      return "Could not complete the AI request.";
  }
}

/**
 * Maps any thrown value from the review path into a safe UI string.
 * Never returns provider-controlled message text.
 */
export function toUserFacingReviewError(error: unknown): string {
  if (isProviderError(error)) {
    return providerErrorUserMessage(error.code);
  }
  if (error instanceof Error) {
    // Allowlisted client-side validation only — never forward arbitrary Error.message
    // (legacy path appended raw provider bodies to Error.message).
    if (/api key is empty/i.test(error.message)) {
      return "OpenAI API key is empty.";
    }
    if (
      error.message === "Write an answer before reviewing." ||
      error.message.startsWith("Answer is too long") ||
      error.message.startsWith("Optional context is too long")
    ) {
      return error.message;
    }
  }
  return providerErrorUserMessage("provider_error");
}
