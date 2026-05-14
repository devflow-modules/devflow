import type { AiAnswerReviewRequest, AiAnswerReviewResult } from "./ai-answer-review";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  parseReviewJsonResponse,
  runMockAnswerReview,
} from "./ai-answer-review";

export type AiAnswerReviewProviderId = "mock" | "openai";

export interface AiAnswerReviewProvider {
  readonly id: AiAnswerReviewProviderId;
  review(request: AiAnswerReviewRequest): Promise<AiAnswerReviewResult>;
}

export function createMockAiAnswerReviewProvider(): AiAnswerReviewProvider {
  return {
    id: "mock",
    async review(request) {
      return runMockAnswerReview(request);
    },
  };
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export function createOpenAiAnswerReviewProvider(apiKey: string): AiAnswerReviewProvider {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("OpenAI API key is empty");
  }
  return {
    id: "openai",
    async review(request) {
      const body = {
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" as const },
        messages: [
          { role: "system", content: buildReviewSystemPrompt() },
          { role: "user", content: buildReviewUserPrompt(request) },
        ],
      };

      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();
      if (!res.ok) {
        throw new Error(`OpenAI error ${res.status}: ${rawText.slice(0, 400)}`);
      }

      let content: string;
      try {
        const json = JSON.parse(rawText) as {
          choices?: { message?: { content?: string } }[];
        };
        content = json.choices?.[0]?.message?.content ?? "";
      } catch {
        throw new Error("OpenAI response was not valid JSON");
      }

      const parsed = parseReviewJsonResponse(content);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }
      return parsed.data;
    },
  };
}

export function resolveAnswerReviewProvider(opts: {
  preferOpenAi: boolean;
  openAiApiKey: string | null | undefined;
}): AiAnswerReviewProvider {
  const key = opts.openAiApiKey?.trim();
  if (opts.preferOpenAi && key) {
    return createOpenAiAnswerReviewProvider(key);
  }
  return createMockAiAnswerReviewProvider();
}
