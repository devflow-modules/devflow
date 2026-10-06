/**
 * Service-worker-only HTTP client for ApplyFlow account APIs.
 * Bearer stays in the SW; content scripts never receive the token.
 */

export type ExtensionApiFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ExtensionApiSuccess<T> = {
  ok: true;
  status: number;
  body: T;
};

export type ExtensionApiResult<T> = ExtensionApiSuccess<T> | ExtensionApiFailure;

export async function extensionApiFetch<T>(input: {
  origin: string;
  token: string;
  path: string;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ExtensionApiResult<T>> {
  let url: URL;
  try {
    url = new URL(input.path, input.origin);
  } catch {
    return { ok: false, status: 0, error: "misconfigured" };
  }
  if (url.origin !== new URL(input.origin).origin) {
    return { ok: false, status: 0, error: "misconfigured" };
  }

  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(url, {
      method: input.method ?? "GET",
      signal: input.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.token}`,
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, status: 0, error: "aborted" };
    }
    return { ok: false, status: 0, error: "network" };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error ?? "request_failed")
        : "request_failed";
    return { ok: false, status: response.status, error };
  }

  return { ok: true, status: response.status, body: body as T };
}
