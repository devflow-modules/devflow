/**
 * Helpers de retry com backoff para chamadas à API WhatsApp.
 * Genérico; sem lógica de tenant.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialMs?: number;
  maxMs?: number;
  factor?: number;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialMs: 500,
  maxMs: 10000,
  factor: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, initialMs, maxMs, factor } = { ...defaultOptions, ...options };
  let lastError: unknown;
  let delay = initialMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, Math.min(delay, maxMs)));
      delay *= factor;
    }
  }
  throw lastError;
}
