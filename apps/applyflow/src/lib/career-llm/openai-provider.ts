import {
  CAREER_LLM_STRUCTURED_OUTPUT_JSON_SCHEMA,
  CAREER_LLM_STRUCTURED_OUTPUT_SCHEMA_NAME,
  type CareerLlmProviderAdapter,
  type CareerLlmProviderErrorCode,
  type CareerLlmProviderRequest,
  type CareerLlmProviderResponse,
} from "@devflow/career-core";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

/** HTTP statuses that may be retried once, alongside transient timeouts. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export type OpenAiCareerLlmProviderOptions = {
  apiKey: string;
  model: string;
  modelAlias: string;
  /** Hard ceiling on retries; the boundary supplies the server-owned value. */
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

type OpenAiResponsesPayload = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

function buildInstructions(request: CareerLlmProviderRequest): string {
  return [
    request.envelope.instructions,
    "",
    "Constraints (always enforced):",
    ...request.envelope.constraints.map((constraint) => `- ${constraint}`),
    "",
    request.envelope.outputSchema,
  ].join("\n");
}

type ProviderError = { code: CareerLlmProviderErrorCode; message: string };

function mapHttpStatusToError(status: number): ProviderError {
  if (status === 401 || status === 403) {
    return { code: "provider_auth_failed", message: "OpenAI rejected the server credentials." };
  }
  if (status === 429) {
    return { code: "provider_rate_limited", message: "OpenAI rate limit was reached." };
  }
  return { code: "provider_request_failed", message: `OpenAI returned status ${status}.` };
}

type AttemptOutcome =
  | { kind: "success"; payload: OpenAiResponsesPayload }
  | { kind: "retryable"; error: ProviderError }
  | { kind: "fatal"; error: ProviderError };

/**
 * Server-side OpenAI provider built on the Responses API with Structured Outputs.
 * No streaming, no tools/function calling, `store: false`, explicit timeout, bounded
 * retries. The API key is never serialized into the response, trace, or observability.
 */
export class OpenAiCareerLlmProvider implements CareerLlmProviderAdapter {
  readonly provider = "openai" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly modelAlias: string;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCareerLlmProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.modelAlias = options.modelAlias;
    this.maxRetries = Math.max(0, options.maxRetries ?? 0);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(request: CareerLlmProviderRequest): Promise<CareerLlmProviderResponse> {
    if (!this.apiKey || !this.model) {
      return {
        ok: false,
        externalCall: false,
        retryCount: 0,
        error: {
          code: "provider_not_configured",
          message: "OpenAI provider requires a server-side API key and model.",
        },
      };
    }

    const requestBody = JSON.stringify({
      model: this.model,
      input: [
        { role: "system", content: buildInstructions(request) },
        { role: "user", content: request.envelope.contextSummary },
      ],
      temperature: request.temperature,
      max_output_tokens: request.maxOutputTokens,
      store: false,
      stream: false,
      text: {
        format: {
          type: "json_schema",
          name: CAREER_LLM_STRUCTURED_OUTPUT_SCHEMA_NAME,
          strict: true,
          schema: CAREER_LLM_STRUCTURED_OUTPUT_JSON_SCHEMA,
        },
      },
    });

    const startedAt = Date.now();
    let retryCount = 0;
    let lastError: ProviderError = {
      code: "provider_request_failed",
      message: "OpenAI request failed.",
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      if (attempt > 0) {
        retryCount = attempt;
      }

      const outcome = await this.runAttempt(requestBody, request.timeoutMs);

      if (outcome.kind === "success") {
        return this.mapPayload(outcome.payload, startedAt, retryCount);
      }

      lastError = outcome.error;
      if (outcome.kind === "fatal") {
        break;
      }
    }

    return {
      ok: false,
      externalCall: true,
      durationMs: Date.now() - startedAt,
      retryCount,
      error: lastError,
    };
  }

  private async runAttempt(requestBody: string, timeoutMs: number): Promise<AttemptOutcome> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: requestBody,
      });

      if (!response.ok) {
        const error = mapHttpStatusToError(response.status);
        return RETRYABLE_STATUSES.has(response.status)
          ? { kind: "retryable", error }
          : { kind: "fatal", error };
      }

      let payload: OpenAiResponsesPayload;
      try {
        payload = (await response.json()) as OpenAiResponsesPayload;
      } catch {
        return {
          kind: "fatal",
          error: { code: "invalid_structured_output", message: "OpenAI returned a non-JSON response body." },
        };
      }

      return { kind: "success", payload };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        kind: "retryable",
        error: aborted
          ? { code: "provider_timeout", message: "OpenAI request timed out." }
          : { code: "provider_request_failed", message: "OpenAI request failed." },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapPayload(
    payload: OpenAiResponsesPayload,
    startedAt: number,
    retryCount: number,
  ): CareerLlmProviderResponse {
    const durationMs = Date.now() - startedAt;
    const usage = {
      inputUnits: payload.usage?.input_tokens ?? 0,
      outputUnits: payload.usage?.output_tokens ?? 0,
    };

    const refusal = this.findRefusal(payload);
    if (refusal) {
      return {
        ok: false,
        externalCall: true,
        durationMs,
        retryCount,
        usage,
        error: { code: "provider_refused", message: "OpenAI refused to produce the requested content." },
      };
    }

    if (payload.status === "incomplete" || payload.incomplete_details?.reason === "max_output_tokens") {
      return {
        ok: false,
        externalCall: true,
        durationMs,
        retryCount,
        usage,
        error: { code: "output_limit_exceeded", message: "OpenAI output exceeded the allowed limits." },
      };
    }

    const text = this.findOutputText(payload);
    if (typeof text !== "string" || text.trim().length === 0) {
      return {
        ok: false,
        externalCall: true,
        durationMs,
        retryCount,
        usage,
        error: { code: "invalid_structured_output", message: "OpenAI returned an empty response." },
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        externalCall: true,
        durationMs,
        retryCount,
        usage,
        error: { code: "invalid_structured_output", message: "OpenAI returned invalid JSON." },
      };
    }

    return {
      ok: true,
      externalCall: true,
      output: parsed,
      modelAlias: this.modelAlias,
      durationMs,
      retryCount,
      usage,
    };
  }

  private findRefusal(payload: OpenAiResponsesPayload): string | undefined {
    for (const item of payload.output ?? []) {
      for (const part of item.content ?? []) {
        if (part.type === "refusal" && typeof part.refusal === "string" && part.refusal.length > 0) {
          return part.refusal;
        }
      }
    }
    return undefined;
  }

  private findOutputText(payload: OpenAiResponsesPayload): string | undefined {
    for (const item of payload.output ?? []) {
      if (item.type && item.type !== "message") {
        continue;
      }
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && typeof part.text === "string") {
          return part.text;
        }
      }
    }
    return undefined;
  }
}

export function createOpenAiCareerLlmProvider(
  options: OpenAiCareerLlmProviderOptions,
): OpenAiCareerLlmProvider {
  return new OpenAiCareerLlmProvider(options);
}
