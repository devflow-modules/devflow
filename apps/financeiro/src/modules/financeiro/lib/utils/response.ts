export type ApiSuccessPayload<T = unknown> = {
  success: true;
  data: T | null;
  message?: string;
};

export type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function buildSuccessPayload<T = unknown>(
  data: T | null = null,
  message?: string
): ApiSuccessPayload<T> {
  const payload: ApiSuccessPayload<T> = { success: true, data };
  if (message) payload.message = message;
  return payload;
}

export function buildErrorPayload(
  message: string,
  code = "ERROR",
  details?: unknown
): ApiErrorPayload {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
