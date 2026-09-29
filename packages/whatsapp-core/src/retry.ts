/**
 * Helpers de retry com backoff para chamadas à API WhatsApp.
 * Genérico; sem lógica de tenant.
 *
 * Por omissão só volta a tentar quando `shouldRetry(error)` é true.
 * Timeouts / rede ambíguos NÃO devem ser retentados em sendText (risco de duplicate-send).
 */

import { shouldRetryMetaFailure, type MetaRetryDecision, MetaApiError } from "./metaErrors";

export interface RetryOptions {
  maxAttempts?: number;
  initialMs?: number;
  maxMs?: number;
  factor?: number;
  /** Se omitido: retry só MetaApiError com decision=retry; outros erros não retentam. */
  shouldRetry?: (error: unknown) => boolean;
  /** Delay extra (ex.: Retry-After). */
  getDelayMs?: (error: unknown, attempt: number, baseDelay: number) => number;
}

const defaultOptions: Required<Pick<RetryOptions, "maxAttempts" | "initialMs" | "maxMs" | "factor">> = {
  maxAttempts: 3,
  initialMs: 500,
  maxMs: 10000,
  factor: 2,
};

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof MetaApiError) {
    return shouldRetryMetaFailure(error.decision);
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, initialMs, maxMs, factor } = { ...defaultOptions, ...options };
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;
  let delay = initialMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts || !shouldRetry(e)) break;
      const wait = options.getDelayMs
        ? options.getDelayMs(e, attempt, delay)
        : e instanceof MetaApiError && e.retryAfterMs != null
          ? Math.max(e.retryAfterMs, Math.min(delay, maxMs))
          : Math.min(delay, maxMs);
      await new Promise((r) => setTimeout(r, wait));
      delay *= factor;
    }
  }
  throw lastError;
}

export type { MetaRetryDecision };
