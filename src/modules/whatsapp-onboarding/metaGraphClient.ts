import { mapMetaError } from "./whatsappOnboarding.errors";
import type { MetaGraphErrorBody } from "./whatsappOnboarding.types";
import { onboardingLog } from "./whatsappOnboarding.logger";

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function buildQuery(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return "";
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : "";
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export class MetaGraphClient {
  constructor(
    private readonly accessToken: string,
    private readonly apiVersion: string,
    private readonly opts?: { timeoutMs?: number; maxRetries?: number }
  ) {}

  private base(): string {
    const v = this.apiVersion.startsWith("v") ? this.apiVersion : `v${this.apiVersion}`;
    return `https://graph.facebook.com/${v}`;
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = `${this.base()}/${path.replace(/^\//, "")}${buildQuery({
      ...query,
      access_token: this.accessToken,
    })}`;
    return this.doFetch<T>("GET", url, undefined, 0);
  }

  async postQuery<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = `${this.base()}/${path.replace(/^\//, "")}${buildQuery({
      ...query,
      access_token: this.accessToken,
    })}`;
    return this.doFetch<T>("POST", url, undefined, 0);
  }

  async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.base()}/${path.replace(/^\//, "")}${buildQuery({
      access_token: this.accessToken,
    })}`;
    return this.doFetch<T>(
      "POST",
      url,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      0
    );
  }

  private async doFetch<T>(
    method: "GET" | "POST",
    url: string,
    init: { headers?: Record<string, string>; body?: string } | undefined,
    attempt: number
  ): Promise<T> {
    const timeoutMs = this.opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = this.opts?.maxRetries ?? 2;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: init?.headers ?? {},
        body: init?.body,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json: unknown = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        onboardingLog.event("error", "graph_non_json", {
          status: res.status,
          snippet: text.slice(0, 200),
        });
        throw mapMetaError(res.status, {});
      }
      if (!res.ok) {
        const mapped = mapMetaError(res.status, json as MetaGraphErrorBody);
        if (
          RETRYABLE.has(res.status) &&
          attempt < maxRetries &&
          res.status !== 429
        ) {
          await sleep(500 * (attempt + 1));
          return this.doFetch<T>(method, url, init, attempt + 1);
        }
        if (res.status === 429 && attempt < maxRetries) {
          await sleep(2000 * (attempt + 1));
          return this.doFetch<T>(method, url, init, attempt + 1);
        }
        const err = new Error(mapped.message) as Error & { mapped: typeof mapped };
        err.mapped = mapped;
        throw err;
      }
      return json as T;
    } catch (e) {
      if (e instanceof Error && "mapped" in e) throw e;
      if ((e as Error).name === "AbortError") {
        const err = new Error("Graph API timeout") as Error & {
          mapped: ReturnType<typeof mapMetaError>;
        };
        err.mapped = mapMetaError(408, {});
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}
