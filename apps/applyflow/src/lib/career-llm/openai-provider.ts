import type {
  CareerLlmProviderAdapter,
  CareerLlmProviderRequest,
  CareerLlmProviderResponse,
} from "@devflow/career-core";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAiCareerLlmProviderOptions = {
  apiKey: string;
  model: string;
  modelAlias: string;
  fetchImpl?: typeof fetch;
};

function buildSystemPrompt(request: CareerLlmProviderRequest): string {
  return [
    request.envelope.instructions,
    "",
    "Constraints (always enforced):",
    ...request.envelope.constraints.map((constraint) => `- ${constraint}`),
    "",
    request.envelope.outputSchema,
  ].join("\n");
}

/**
 * Server-side OpenAI provider. No streaming, no function/tool calling, explicit timeout,
 * structured output only. The API key is never serialized into the response or trace.
 */
export class OpenAiCareerLlmProvider implements CareerLlmProviderAdapter {
  readonly provider = "openai" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly modelAlias: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCareerLlmProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.modelAlias = options.modelAlias;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(request: CareerLlmProviderRequest): Promise<CareerLlmProviderResponse> {
    if (!this.apiKey) {
      return {
        ok: false,
        externalCall: false,
        error: { code: "provider_not_configured", message: "OpenAI API key is not configured." },
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await this.fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: request.temperature,
          max_tokens: request.maxOutputTokens,
          stream: false,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(request) },
            { role: "user", content: request.envelope.contextSummary },
          ],
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          externalCall: true,
          durationMs: Date.now() - startedAt,
          error: { code: "provider_request_failed", message: `OpenAI returned status ${response.status}.` },
        };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        return {
          ok: false,
          externalCall: true,
          durationMs: Date.now() - startedAt,
          error: { code: "invalid_structured_output", message: "OpenAI returned no content." },
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return {
          ok: false,
          externalCall: true,
          durationMs: Date.now() - startedAt,
          error: { code: "invalid_structured_output", message: "OpenAI returned invalid JSON." },
        };
      }

      return {
        ok: true,
        externalCall: true,
        output: parsed,
        modelAlias: this.modelAlias,
        durationMs: Date.now() - startedAt,
        usage: {
          inputUnits: payload.usage?.prompt_tokens ?? 0,
          outputUnits: payload.usage?.completion_tokens ?? 0,
        },
      };
    } catch {
      return {
        ok: false,
        externalCall: true,
        durationMs: Date.now() - startedAt,
        error: { code: "provider_request_failed", message: "OpenAI request failed or timed out." },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createOpenAiCareerLlmProvider(
  options: OpenAiCareerLlmProviderOptions,
): OpenAiCareerLlmProvider {
  return new OpenAiCareerLlmProvider(options);
}
